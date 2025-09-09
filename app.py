# app.py
from ollama_helper import get_kosher_response
from flask import Flask, render_template, request, session, redirect, flash, jsonify, url_for
from models.database import database as db  # db הוא אינסטנס של Database()
import os
from werkzeug.utils import secure_filename
from PIL import Image
import uuid
from datetime import datetime
import requests
from flask import request, render_template
from ollama_helper import ask_with_context
from ollama_helper import get_kosher_response
import re
import os
import sendgrid
from sendgrid.helpers.mail import Mail



app = Flask(__name__)
app.secret_key = 'roladin-secret-2025'

# פונקציות עזר
def get_current_user():
    """קבלת המשתמש הנוכחי מה-session"""
    user_id = session.get('user_id')
    if user_id:
        return db.get_user_by_id(user_id)
    return None

def require_login():
    """בדיקה שהמשתמש מחובר"""
    return 'user_id' in session

def require_employee():
    """בדיקה שהמשתמש הוא עובד"""
    user = get_current_user()
    return user and user['role'] == 'employee'

def normalize_text(text):
    """ניקוי טקסט לשאלות חכמות יותר"""
    text = text.lower()  # הכל לאותיות קטנות
    text = re.sub(r"[^\u0590-\u05FFa-z0-9 ]", "", text)  # מסיר סימני פיסוק
    return text.strip()


def get_context_from_site(question):
    """מקבל שאלה ומחזיר הקשר רלוונטי מתוך האתר/מסד הנתונים"""
    q = question.lower()
    context = ""

    # בדיקה על תפריט
    if "תפריט" in q or "menu" in q:
        items = db.get_menu_items()
        context = "התפריט כולל: " + ", ".join([f"{i['name']} (₪{i['price']})" for i in items])

    # בדיקה על עגלה
    elif "עגלה" in q or "cart" in q:
        cart_items = session.get('cart', [])
        if cart_items:
            context = "בעגלה שלך יש: " + ", ".join([f"{c['name']} x{c['quantity']}" for c in cart_items])
        else:
            context = "העגלה שלך ריקה כרגע."

    # בדיקה על הזמנות
    elif "הזמנה" in q or "order" in q:
        user = get_current_user()
        if user:
            orders = db.get_orders_by_customer(user['id'])
            if orders:
                context = "הזמנות קודמות: " + ", ".join(
                    [f"הזמנה #{o['order_number']} - {o['status']}" for o in orders]
                )
            else:
                context = "לא נמצאו הזמנות קודמות."
        else:
            context = "צריך להתחבר כדי לראות הזמנות."

    return context


# הגדרות העלאת תמונות
UPLOAD_FOLDER = 'static/images/menu-items'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_unique_filename(original_filename):
    """יצירת שם קובץ ייחודי"""
    file_extension = original_filename.rsplit('.', 1)[1].lower()
    unique_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f"{timestamp}_{unique_id}.{file_extension}"

def optimize_image(image_path, max_width=800, max_height=600, quality=85):
    """אופטימיזציה של תמונה"""
    try:
        with Image.open(image_path) as img:
            # המרה ל-RGB אם צריך
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # שינוי גודל אם צריך
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            
            # שמירה עם דחיסה
            img.save(image_path, 'JPEG', quality=quality, optimize=True)
        return True
    except Exception as e:
        print(f"Error optimizing image: {e}")
        return False

# יצירת תיקיות
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('static/images/general', exist_ok=True)

def send_email(to_email, subject, content):
    sg = sendgrid.SendGridAPIClient(api_key=os.environ.get("SENDGRID_API_KEY"))
    message = Mail(
        from_email="noreply@roladin.com",  # אפשר לשים מייל אמיתי שלך
        to_emails=to_email,
        subject=subject,
        html_content=f"<p>{content}</p>"
    )
    try:
        response = sg.send(message)
        print(f"✅ מייל נשלח ל {to_email}, סטטוס: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ שגיאה בשליחת מייל: {e}")
        return False


# Routes בסיסיים
@app.route('/')
def home():
    """עמוד הבית - הצגת תפריט וקטגוריות"""
    user = get_current_user()
    menu_items = db.get_menu_items()
    categories = db.get_menu_categories()
    
    return render_template('home.html', 
                         user=user, 
                         menu_items=menu_items, 
                         categories=[{'category': cat} for cat in categories])

@app.route('/login', methods=['GET', 'POST'])
def login():
    """התחברות למערכת"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = db.authenticate_user(username, password)
        
        if user:
            # שמירה ב-session
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            
            # רישום פעילות
            db.log_activity(user['id'], 'login', f'User {username} logged in', request.remote_addr)
            
            flash('התחברת בהצלחה!', 'success')
            
            # הפניה לפי תפקיד
            if user['role'] == 'employee':
                return redirect('/dashboard')
            else:
                return redirect('/')
        else:
            flash('שם משתמש או סיסמה שגויים', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """רישום משתמש חדש"""
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        phone = request.form.get('phone', '')
        address = request.form.get('address', '')
        
        # יצירת המשתמש
        user_id = db.create_user(username, email, password, phone=phone, address=address)
        
        if user_id:
            # התחברות אוטומטית
            user = db.get_user_by_id(user_id)
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            
            # רישום פעילות
            db.log_activity(user_id, 'register', f'New user {username} registered', request.remote_addr)
            
            flash('נרשמת בהצלחה!', 'success')
            return redirect('/')
        else:
            flash('שם משתמש או אימייל כבר קיימים במערכת', 'error')
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    """התנתקות מהמערכת"""
    user_id = session.get('user_id')
    if user_id:
        db.log_activity(user_id, 'logout', 'User logged out', request.remote_addr)
    
    session.clear()
    flash('התנתקת בהצלחה', 'info')
    return redirect('/')

@app.route('/menu')
def menu():
    user = get_current_user()
    category = request.args.get('category')
    
    menu_items = db.get_menu_items(category=category, available_only=True)
    categories = db.get_menu_categories()

    # המרה של created_at ל-datetime
    for item in menu_items:
        if "created_at" in item and isinstance(item["created_at"], str):
            try:
                item["created_at"] = datetime.strptime(item["created_at"], "%Y-%m-%d %H:%M:%S")
            except ValueError:
                item["created_at"] = None

    return render_template(
        'menu.html',
        user=user,
        menu_items=menu_items,
        categories=[{'category': cat} for cat in categories],
        selected_category=category,
        now=datetime.now
    )

# ========================
# נתיבי ניהול תמונות
# ========================

@app.route('/upload_item_image', methods=['POST'])
def upload_item_image():
    """העלאת תמונה לפריט תפריט"""
    if not require_employee():
        return jsonify({'success': False, 'error': 'אין הרשאה לבצע פעולה זו'}), 403
    
    # בדיקת נתונים
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'לא נבחרה תמונה'}), 400
    
    file = request.files['image']
    item_id = request.form.get('item_id')
    
    if not item_id:
        return jsonify({'success': False, 'error': 'מזהה פריט חסר'}), 400
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'לא נבחרה תמונה'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'סוג קובץ לא נתמך. השתמש ב-JPG, PNG, GIF או WebP'}), 400
    
    try:
        # בדיקה שהפריט קיים
        menu_item = db.get_menu_item_by_id(item_id)
        if not menu_item:
            return jsonify({'success': False, 'error': 'פריט לא נמצא'}), 404
        
        # מחיקת תמונה קיימת אם יש
        if menu_item.get('image_filename'):
            old_image_path = os.path.join(app.config['UPLOAD_FOLDER'], menu_item['image_filename'])
            if os.path.exists(old_image_path):
                os.remove(old_image_path)
        
        # שמירת התמונה החדשה
        filename = create_unique_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # אופטימיזציה של התמונה
        if not optimize_image(file_path):
            return jsonify({'success': False, 'error': 'שגיאה בעיבוד התמונה'}), 500
        
        # עדכון במסד הנתונים
        success = db.update_menu_item_image(item_id, filename)
        
        if success:
            # רישום פעילות
            user = get_current_user()
            db.log_activity(
                user['id'], 
                'image_upload', 
                f'Image uploaded for menu item {item_id}', 
                request.remote_addr
            )
            
            return jsonify({
                'success': True, 
                'message': 'התמונה הועלתה בהצלחה',
                'image_url': url_for('static', filename=f'images/menu-items/{filename}'),
                'filename': filename
            })
        else:
            # מחיקת הקובץ אם העדכון במסד הנתונים נכשל
            os.remove(file_path)
            return jsonify({'success': False, 'error': 'שגיאה בעדכון מסד הנתונים'}), 500
            
    except Exception as e:
        print(f"Error uploading image: {e}")
        return jsonify({'success': False, 'error': 'שגיאה לא צפויה בהעלאת התמונה'}), 500

@app.route('/delete_item_image/<int:item_id>', methods=['DELETE'])
def delete_item_image(item_id):
    """מחיקת תמונה של פריט תפריט"""
    if not require_employee():
        return jsonify({'success': False, 'error': 'אין הרשאה לבצע פעולה זו'}), 403
    
    try:
        # קבלת פרטי הפריט
        menu_item = db.get_menu_item_by_id(item_id)
        if not menu_item:
            return jsonify({'success': False, 'error': 'פריט לא נמצא'}), 404
        
        image_filename = menu_item.get('image_filename')
        if not image_filename:
            return jsonify({'success': False, 'error': 'לפריט אין תמונה'}), 400
        
        # מחיקת הקובץ מהשרת
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # עדכון במסד הנתונים
        success = db.update_menu_item_image(item_id, None)
        
        if success:
            # רישום פעילות
            user = get_current_user()
            db.log_activity(
                user['id'], 
                'image_delete', 
                f'Image deleted for menu item {item_id}', 
                request.remote_addr
            )
            
            return jsonify({
                'success': True, 
                'message': 'התמונה נמחקה בהצלחה'
            })
        else:
            return jsonify({'success': False, 'error': 'שגיאה בעדכון מסד הנתונים'}), 500
            
    except Exception as e:
        print(f"Error deleting image: {e}")
        return jsonify({'success': False, 'error': 'שגיאה לא צפויה במחיקת התמונה'}), 500

@app.route('/api/cart-count')
def api_cart_count():
    """API לקבלת מספר פריטים בעגלה"""
    cart_items = session.get('cart', [])
    count = sum(item['quantity'] for item in cart_items)
    total = sum(item['price'] * item['quantity'] for item in cart_items)
    
    return jsonify({
        'count': count,
        'total': total
    })

# ========================
# שאר הנתיבים המקוריים
# ========================

@app.route('/add_to_cart', methods=['POST'])
def add_to_cart():
    """הוספת פריט לעגלה"""
    if not require_login():
        flash('יש להתחבר כדי להוסיף פריטים לעגלה', 'warning')
        return redirect('/login')
    
    item_id = int(request.form.get('item_id'))
    quantity = int(request.form.get('quantity', 1))
    special_requests = request.form.get('special_requests', '')
    
    # קבלת פרטי הפריט
    menu_item = db.get_menu_item_by_id(item_id)
    
    if not menu_item:
        flash('פריט לא נמצא', 'error')
        return redirect('/menu')
    
    # הוספה לעגלה ב-session
    if 'cart' not in session:
        session['cart'] = []
    
    cart_item = {
        'id': menu_item['id'],
        'name': menu_item['name'],
        'price': menu_item['price'],
        'quantity': quantity,
        'special_requests': special_requests
    }
    
    # בדיקה אם הפריט כבר קיים בעגלה
    found = False
    for existing_item in session['cart']:
        if (existing_item['id'] == item_id and 
            existing_item['special_requests'] == special_requests):
            existing_item['quantity'] += quantity
            found = True
            break
    
    if not found:
        session['cart'].append(cart_item)
    
    session.modified = True
    flash(f'{menu_item["name"]} נוסף לעגלה', 'success')
    return redirect('/menu')

@app.route('/cart')
def cart():
    """עגלת קניות"""
    if not require_login():
        flash('יש להתחבר כדי לצפות בעגלה', 'warning')
        return redirect('/login')
    
    user = get_current_user()
    cart_items = session.get('cart', [])
    total = sum(item['price'] * item['quantity'] for item in cart_items)
    
    return render_template('cart.html', 
                         user=user, 
                         cart_items=cart_items, 
                         total=total)

@app.route('/remove_from_cart', methods=['POST'])
def remove_from_cart():
    """הסרת פריט מהעגלה"""
    item_index = int(request.form.get('item_index'))
    cart = session.get('cart', [])
    
    if 0 <= item_index < len(cart):
        removed_item = cart.pop(item_index)
        session['cart'] = cart
        session.modified = True
        flash(f'{removed_item["name"]} הוסר מהעגלה', 'info')
    
    return redirect('/cart')

@app.route('/checkout', methods=['GET', 'POST'])
def checkout():
    """עמוד התשלום וביצוע ההזמנה"""
    if not require_login():
        flash('יש להתחבר כדי לבצע הזמנה', 'warning')
        return redirect('/login')
    
    user = get_current_user()
    cart_items = session.get('cart', [])
    
    if not cart_items:
        flash('העגלה ריקה', 'warning')
        return redirect('/menu')
    
    if request.method == 'POST':
        # קבלת נתוני הטופס
        delivery_address = request.form.get('delivery_address', '')
        delivery_phone = request.form.get('delivery_phone', '')
        special_instructions = request.form.get('special_instructions', '')
        payment_method = request.form.get('payment_method', 'credit_card')
        
        # יצירת הזמנה חדשה
        order_id, order_number = db.create_order(
            user['id'], 
            delivery_address, 
            delivery_phone, 
            special_instructions
        )
        
        # הוספת פריטים להזמנה
        for item in cart_items:
            db.add_order_item(
                order_id, 
                item['id'], 
                item['quantity'], 
                item['special_requests']
            )
        
        # חישוב ועדכון סכום כולל
        total_amount = db.update_order_total(order_id)
        
        # יצירת תשלום
        transaction_id = f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payment_id = db.create_payment(order_id, total_amount, payment_method, transaction_id)
        
        # עדכון סטטוס הזמנה לאושרה
        db.update_order_status(order_id, 'confirmed')
        
        # רישום פעילות
        db.log_activity(user['id'], 'order_created', f'Order {order_number} created', request.remote_addr)
        
        # ניקוי עגלה
        session.pop('cart', None)
        session.modified = True
        
        flash(f'ההזמנה {order_number} נוצרה בהצלחה!', 'success')
        return redirect(f'/order/{order_id}')
    
    # חישוב סכום לתצוגה
    total = sum(item['price'] * item['quantity'] for item in cart_items)
    
    return render_template('checkout.html', 
                         user=user, 
                         cart_items=cart_items, 
                         total=total)

@app.route('/order/<int:order_id>')
def order_details(order_id):
    """הצגת פרטי הזמנה"""
    if not require_login():
        flash('יש להתחבר כדי לצפות בהזמנה', 'warning')
        return redirect('/login')
    
    user = get_current_user()
    order = db.get_order_by_id(order_id)
    
    if not order:
        flash('הזמנה לא נמצאה', 'error')
        return redirect('/')
    
    # בדיקת הרשאות - רק העובד או הלקוח עצמו יכולים לצפות
    if user['role'] != 'employee' and order['customer_id'] != user['id']:
        flash('אין לך הרשאה לצפות בהזמנה זו', 'error')
        return redirect('/')
    
    return render_template('order_details.html', 
                         user=user, 
                         order=order, 
                         order_items=order['items'])

@app.route('/my_orders')
def my_orders():
    """הזמנות הלקוח"""
    if not require_login():
        flash('יש להתחבר כדי לצפות בהזמנות', 'warning')
        return redirect('/login')
    
    user = get_current_user()
    orders = db.get_orders_by_customer(user['id'])
    
    return render_template('my_orders.html', user=user, orders=orders)

@app.route('/dashboard')
def dashboard():
    """דשבורד עובדים"""
    if not require_employee():
        flash('אין לך הרשאה לגשת לעמוד זה', 'error')
        return redirect('/')
    
    user = get_current_user()
    stats = db.get_today_stats()
    
    # קבלת הזמנות אחרונות
    conn = db.get_connection()
    recent_orders = conn.execute('''
        SELECT o.*, u.username 
        FROM orders o 
        JOIN users u ON o.customer_id = u.id 
        ORDER BY o.created_at DESC 
        LIMIT 10
    ''').fetchall()
    conn.close()
    
    return render_template('dashboard.html', 
                         user=user, 
                         stats=stats, 
                         recent_orders=[dict(order) for order in recent_orders])

@app.route('/update_order_status', methods=['POST'])
def update_order_status():
    """עדכון סטטוס הזמנה - עובדים בלבד"""
    if not require_employee():
        return jsonify({'success': False, 'message': 'אין הרשאה'})
    
    order_id = int(request.form.get('order_id'))
    new_status = request.form.get('status')
    
    # עדכון הסטטוס
    success = db.update_order_status(order_id, new_status)
    
    if success:
        user = get_current_user()
        db.log_activity(
            user['id'], 
            'order_status_update', 
            f'Order {order_id} status changed to {new_status}', 
            request.remote_addr
        )
        
        return jsonify({
            'success': True, 
            'message': f'סטטוס הזמנה עודכן ל: {new_status}'
        })
    else:
        return jsonify({
            'success': False, 
            'message': 'שגיאה בעדכון הסטטוס'
        })

# API Routes
@app.route('/api/menu')
def api_menu():
    """API לקבלת תפריט"""
    category = request.args.get('category')
    menu_items = db.get_menu_items(category=category, available_only=True)
    return jsonify(menu_items)

@app.route('/api/menu/<int:item_id>')
def api_menu_item(item_id):
    """API לקבלת פריט ספציפי"""
    item = db.get_menu_item_by_id(item_id)
    if item:
        return jsonify(item)
    else:
        return jsonify({'error': 'Item not found'}), 404
    
@app.route("/ai_agent", methods=["GET", "POST"])
def ai_agent():
    answer = None
    if request.method == "POST":
        user_question = request.form.get("question")

        # כאן פרומפט בסיסי – אחר כך נחבר ל־DB
        prompt = f"""
        אתה סוכן מידע של מסעדת רולדין.
        השאלה של המשתמש: "{user_question}"
        תענה אך ורק בהקשר של המסעדה, התפריט או ההזמנות.
        """
        answer = get_kosher_response(prompt)

    return render_template("ai_agent.html", answer=answer)

# Error Handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({'success': False, 'error': 'הקובץ גדול מדי. הגודל המקסימלי הוא 5MB'}), 413



@app.route('/ai_helper', methods=['GET', 'POST'])
def ai_helper():
    """מסך העוזר החכם"""
    user = get_current_user()
    question, answer = None, None

    if request.method == 'POST':
        question = request.form.get('question')

        # כאן ניתן להוסיף הקשר מהאתר
        context = "באתר יש תפריט עם קטגוריות: עוגות, מאפים, משקאות, קינוחים."

        prompt = f"""
        אתה עוזר חכם לאתר מסעדת רולדין.
        מידע רלוונטי: {context}

        שאלה מהמשתמש: {question}
        """

        answer = get_kosher_response(prompt, model="llama3.1")  # משתמשת בפונקציה שלך

    return render_template("ai_helper.html", user=user, question=question, answer=answer)



@app.route('/ask_ai', methods=['POST'])
def ask_ai():
    """
    שליחת שאלה לעוזר החכם:
    - קודם ננסה לענות מתוך המערכת (DB/Session)
    - אם לא, נפנה ל-Ollama (LLM)
    """
    data = request.get_json(force=True)
    question = (data.get("question") or "").strip()
    norm_q = normalize_text(question)  # מנקה את השאלה

    if not question:
        return jsonify({"ok": False, "answer": "לא כתבת שאלה."}), 400

    try:
        # ====== תשובה חכמה מתוך המערכת (DB/Session) ======
        answer_from_db = None

        # תפריט/מוצרים
        if any(k in norm_q for k in ["תפריט", "מוצרים", "מנות", "מה יש", "מה בתפריט"]):
            items = db.get_menu_items(available_only=True)
            if items:
                names = ", ".join([i["name"] for i in items[:12]])
                answer_from_db = f"המוצרים הזמינים כרגע: {names}."

        # קטגוריות
        elif any(k in norm_q for k in ["קטגוריה", "קטגוריות", "סוגי אוכל"]):
            cats = db.get_menu_categories()
            if cats:
                answer_from_db = "הקטגוריות שלנו: " + ", ".join(cats) + "."

        # שעות פתיחה
        elif any(k in norm_q for k in ["שעות פתיחה", "מתי פתוחים", "מתי אתם פתוחים", "באיזה ימים"]):
            answer_from_db = "אנחנו פתוחים בימים א'-ה' מ-08:00 עד 22:00, ובשישי עד 14:00."

        # כתובת סניף
        elif any(k in norm_q for k in ["איפה אתם", "כתובת", "איך להגיע", "מיקום"]):
            answer_from_db = "הסניף הראשי שלנו נמצא ברחוב דיזנגוף 100, תל אביב."

        # עגלה
        elif "עגלה" in norm_q:
            cart = session.get("cart", [])
            if not cart:
                answer_from_db = "העגלה שלך כרגע ריקה."
            else:
                items = [f'{c["name"]} (x{c["quantity"]})' for c in cart]
                total = sum(c["price"] * c["quantity"] for c in cart)
                answer_from_db = "בעגלה שלך יש: " + ", ".join(items) + f". סה\"כ משוער: ₪{total:.2f}"

        # הזמנות שלי
        elif any(k in norm_q for k in ["הזמנה", "הזמנות", "מספר הזמנה", "סטטוס הזמנה"]):
            if require_login():
                user = get_current_user()
                orders = db.get_orders_by_customer(user["id"])
                if not orders:
                    answer_from_db = "לא נמצאו הזמנות קודמות שלך."
                else:
                    latest = orders[0]
                    answer_from_db = (
                        f'ההזמנה האחרונה שלך: #{latest["order_number"]} '
                        f'בסכום ₪{latest["total_amount"]:.2f}, סטטוס: {latest["status"]}.'
                    )
            else:
                answer_from_db = "כדי לראות הזמנות עליך להתחבר למערכת."

        if answer_from_db:
            return jsonify({"ok": True, "answer": answer_from_db})

        # ====== פניה ל-Ollama אם אין תשובה פנימית ======
        OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
        payload = {
            "model": "llama2",
            "messages": [
                {"role": "system", "content": "את/ה עוזר חכם של אתר 'מסעדת רולדין'. ענה/י בעברית, קצר, ברור ועדכני."},
                {"role": "user", "content": question}
            ],
            "stream": False
        }

        r = requests.post(OLLAMA_URL, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        answer = (data.get("message") or {}).get("content") or data.get("response") or "לא התקבלה תשובה."

        return jsonify({"ok": True, "answer": answer})

    except requests.exceptions.RequestException as e:
        print("❌ שגיאת רשת מול Ollama:", e)
        return jsonify({"ok": False, "answer": "לא הצלחתי לדבר עם העוזר. ודאי שאולמה פתוח ושמודל llama2 מותקן."}), 502

    except Exception as e:
        print("❌ שגיאה בשרת:", e)
        return jsonify({"ok": False, "answer": "אירעה שגיאה בעת יצירת התשובה."}), 500

if __name__ == '__main__':
    print("🚀 מתחיל את מסעדת רולדין...")
    print("📊 יוצר מסד נתונים ונתונים לדוגמה...")
    
    # בדיקת תלות PIL
    try:
        from PIL import Image
        print("✅ PIL זמין - אופטימיזציה של תמונות מופעלת")
    except ImportError:
        print("⚠️  PIL לא זמין - התקן עם: pip install Pillow")
    
    # אתחול מסד הנתונים יקרה אוטומטית כשנייבא את database.py
    
    print("✅ המערכת מוכנה!")
    print("🌐 כתובת: http://localhost:5000")
    print("👤 עובד: admin / admin123")
    print("🛒 לקוח: customer1 / customer123")
    print("📸 ניהול תמונות זמין למנהלים")

    
    app.run(debug=True, port=5000)
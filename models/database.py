# database.py
import sqlite3
from datetime import datetime
import os

class db:
    def __init__(self, db_path='roladin_restaurant.db'):
        self.db_path = db_path
        self.init_database()
        # הוסרה השורה הבעייתית: self.image_filename = image_filename
    
    def get_connection(self):
        """יצירת חיבור למסד הנתונים"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # מאפשר גישה לעמודות באמצעות שם
        return conn
    
    def init_database(self):
        """יצירת טבלאות והכנסת נתונים בסיסיים"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # יצירת טבלת משתמשים
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'customer',
                phone TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # יצירת טבלת פריטי תפריט - עדכון עם שדה תמונה
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                image_url TEXT,
                image_filename TEXT,
                is_available BOOLEAN DEFAULT 1,
                preparation_time INTEGER DEFAULT 15,
                ingredients TEXT,
                allergens TEXT,
                calories INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # יצירת טבלת הזמנות
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                order_number TEXT UNIQUE NOT NULL,
                total_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                delivery_address TEXT,
                delivery_phone TEXT,
                special_instructions TEXT,
                estimated_delivery TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES users (id)
            )
        ''')
        
        # יצירת טבלת פריטי הזמנה
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                menu_item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                price REAL NOT NULL,
                special_requests TEXT,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
            )
        ''')
        
        # יצירת טבלת תשלומים
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                transaction_id TEXT,
                card_last_four TEXT,
                payment_processor TEXT,
                processed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders (id)
            )
        ''')
        
        # יצירת טבלת לוג פעילות
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                description TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        
        # הוספת נתונים בסיסיים אם הטבלאות ריקות
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            self.create_sample_data(conn)
        
        # הוספת עמודת image_filename אם היא לא קיימת (עבור מסדי נתונים קיימים)
        try:
            cursor.execute("ALTER TABLE menu_items ADD COLUMN image_filename TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            # העמודה כבר קיימת
            pass
            
        conn.close()
    
    def create_sample_data(self, conn):
        """יצירת נתונים לדוגמה"""
        cursor = conn.cursor()
        
        # יצירת עובד ראשון
        cursor.execute('''
            INSERT INTO users (username, email, password, role)
            VALUES (?, ?, ?, ?)
        ''', ('admin', 'admin@roladin.co.il', 'admin123', 'employee'))
        
        # יצירת לקוח לדוגמה
        cursor.execute('''
            INSERT INTO users (username, email, password, role, phone, address)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('customer1', 'customer@example.com', 'customer123', 'customer', 
              '050-1234567', 'תל אביב, רחוב הרצל 1'))
        
        # מוצרי תפריט לדוגמה עם שמות תמונות
        menu_items = [
            ('עוגת שוקולד', 'עוגת שוקולד עשירה וטעימה', 45.0, 'עוגות', 20, 'cake.png'),
            ('קרואסון חמאה', 'קרואסון טרי עם חמאה איכותית', 12.0, 'מאפים', 5, 'croissant.jpg'),
            ('קפה שחור', 'קפה ערבי מעולה', 15.0, 'משקאות', 3, 'coffee.jpg'),
            ('אקלר קרם', 'אקלר במילוי קרם וניל', 18.0, 'קינוחים', 10, 'eclair.jpg'),
            ('מאפין אוכמניות', 'מאפין טרי עם אוכמניות טבעיות', 22.0, 'מאפים', 15, 'muffin.jpg'),
            ('קפה הפוך', 'קפה עם חלב מוקצף', 18.0, 'משקאות', 4, 'cappuccino.jpg'),
            ('עוגת גבינה', 'עוגת גבינה קלאסית', 38.0, 'עוגות', 25, 'cheesecake.jpg'),
            ('בורקס גבינה', 'בורקס טרי במילוי גבינה', 16.0, 'מאפים', 8, 'burekas.png')
        ]
        
        for item in menu_items:
            cursor.execute('''
                INSERT INTO menu_items (name, description, price, category, preparation_time, image_filename)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', item)
        
        conn.commit()
        print("נתונים לדוגמה נוצרו בהצלחה!")
    
    # פונקציות למשתמשים
    def create_user(self, username, email, password, role='customer', phone='', address=''):
        """יצירת משתמש חדש"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO users (username, email, password, role, phone, address)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (username, email, password, role, phone, address))
            
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return user_id
        except sqlite3.IntegrityError:
            conn.close()
            return None
    
    def authenticate_user(self, username, password):
        """אימות משתמש"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, password, role, phone, address
            FROM users WHERE username = ? AND password = ? AND is_active = 1
        ''', (username, password))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return dict(user)
        return None
    
    def get_user_by_id(self, user_id):
        """קבלת משתמש לפי ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, role, phone, address, created_at
            FROM users WHERE id = ? AND is_active = 1
        ''', (user_id,))
        
        user = cursor.fetchone()
        conn.close()
        
        return dict(user) if user else None
    
    # פונקציות לתפריט
    def get_menu_items(self, category=None, available_only=True):
        """קבלת פריטי תפריט"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        query = 'SELECT * FROM menu_items'
        params = []
        
        conditions = []
        if available_only:
            conditions.append('is_available = 1')
        if category:
            conditions.append('category = ?')
            params.append(category)
        
        if conditions:
            query += ' WHERE ' + ' AND '.join(conditions)
        
        query += ' ORDER BY category, name'
        
        cursor.execute(query, params)
        items = cursor.fetchall()
        conn.close()
        
        return [dict(item) for item in items]
    
    def get_menu_categories(self):
        """קבלת קטגוריות תפריט"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT DISTINCT category FROM menu_items WHERE is_available = 1')
        categories = cursor.fetchall()
        conn.close()
        
        return [cat['category'] for cat in categories]
    
    def get_menu_item_by_id(self, item_id):
        """קבלת פריט תפריט לפי ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM menu_items WHERE id = ?', (item_id,))
        item = cursor.fetchone()
        conn.close()
        
        return dict(item) if item else None
    
    def update_menu_item_image(self, item_id, image_filename):
        """עדכון תמונה של פריט תפריט"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE menu_items 
            SET image_filename = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (image_filename, item_id))
        
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    
    def add_menu_item(self, name, description, price, category, image_filename=None):
        """הוספת פריט תפריט חדש"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO menu_items (name, description, price, category, image_filename)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, description, price, category, image_filename))
        
        item_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return item_id
    
    # פונקציות להזמנות
    def create_order(self, customer_id, delivery_address='', delivery_phone='', special_instructions=''):
        """יצירת הזמנה חדשה"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # יצירת מספר הזמנה ייחודי
        import random
        order_number = f"ROL{datetime.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"
        
        cursor.execute('''
            INSERT INTO orders (customer_id, order_number, delivery_address, delivery_phone, special_instructions)
            VALUES (?, ?, ?, ?, ?)
        ''', (customer_id, order_number, delivery_address, delivery_phone, special_instructions))
        
        order_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return order_id, order_number
    
    def add_order_item(self, order_id, menu_item_id, quantity, special_requests=''):
        """הוספת פריט להזמנה"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # קבלת מחיר הפריט
        cursor.execute('SELECT price FROM menu_items WHERE id = ?', (menu_item_id,))
        price_row = cursor.fetchone()
        
        if not price_row:
            conn.close()
            return False
        
        price = price_row['price']
        
        cursor.execute('''
            INSERT INTO order_items (order_id, menu_item_id, quantity, price, special_requests)
            VALUES (?, ?, ?, ?, ?)
        ''', (order_id, menu_item_id, quantity, price, special_requests))
        
        conn.commit()
        conn.close()
        return True
    
    def get_order_by_id(self, order_id):
        """קבלת הזמנה לפי ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # קבלת פרטי ההזמנה
        cursor.execute('''
            SELECT o.*, u.username, u.email 
            FROM orders o
            JOIN users u ON o.customer_id = u.id
            WHERE o.id = ?
        ''', (order_id,))
        
        order = cursor.fetchone()
        if not order:
            conn.close()
            return None
        
        order_dict = dict(order)
        
        # קבלת פריטי ההזמנה
        cursor.execute('''
            SELECT oi.*, mi.name, mi.description, mi.category
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE oi.order_id = ?
        ''', (order_id,))
        
        items = cursor.fetchall()
        order_dict['items'] = [dict(item) for item in items]
        
        conn.close()
        return order_dict
    
    def update_order_total(self, order_id):
        """עדכון סכום כולל של הזמנה"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT SUM(quantity * price) as total
            FROM order_items
            WHERE order_id = ?
        ''', (order_id,))
        
        total = cursor.fetchone()['total'] or 0
        
        cursor.execute('''
            UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (total, order_id))
        
        conn.commit()
        conn.close()
        return total
    
    def get_orders_by_customer(self, customer_id):
        """קבלת הזמנות לקוח"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM orders 
            WHERE customer_id = ? 
            ORDER BY created_at DESC
        ''', (customer_id,))
        
        orders = cursor.fetchall()
        conn.close()
        
        return [dict(order) for order in orders]
    
    def update_order_status(self, order_id, status):
        """עדכון סטטוס הזמנה"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (status, order_id))
        
        conn.commit()
        conn.close()
        return cursor.rowcount > 0
    
    # פונקציות לתשלומים
    def create_payment(self, order_id, amount, payment_method, transaction_id=''):
        """יצירת תשלום"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO payments (order_id, amount, payment_method, transaction_id, status)
            VALUES (?, ?, ?, ?, 'completed')
        ''', (order_id, amount, payment_method, transaction_id))
        
        payment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return payment_id
    
    # פונקציות סטטיסטיקה
    def get_today_stats(self):
        """סטטיסטיקות היום"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        cursor.execute('''
            SELECT 
                COUNT(*) as orders_today,
                COALESCE(SUM(total_amount), 0) as revenue_today
            FROM orders 
            WHERE DATE(created_at) = ?
        ''', (today,))
        
        stats = dict(cursor.fetchone())
        
        cursor.execute("SELECT COUNT(*) as pending_orders FROM orders WHERE status = 'pending'")
        stats.update(dict(cursor.fetchone()))
        
        conn.close()
        return stats
    
    def log_activity(self, user_id, action, description, ip_address=''):
        """רישום פעילות"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO activity_logs (user_id, action, description, ip_address)
            VALUES (?, ?, ?, ?)
        ''', (user_id, action, description, ip_address))
        
        conn.commit()
        conn.close()

# יצירת אינסטנס גלובלי
database = db()
import mysql.connector
from mysql.connector import Error

try:
    connection = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='avrc_db'
    )
    
    if connection.is_connected():
        cursor = connection.cursor()
        
        # Get current columns
        cursor.execute("DESCRIBE equipment_returns")
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {existing_columns}")
        
        # Add new columns if they don't exist
        alter_statements = [
            ("username", "ALTER TABLE equipment_returns ADD COLUMN username VARCHAR(255) AFTER user_id"),
            ("equipment_name", "ALTER TABLE equipment_returns ADD COLUMN equipment_name VARCHAR(255) AFTER username"),
            ("department", "ALTER TABLE equipment_returns ADD COLUMN department VARCHAR(50) AFTER equipment_name"),
            ("id_number", "ALTER TABLE equipment_returns ADD COLUMN id_number VARCHAR(100) AFTER department"),
        ]
        
        for col_name, alter_sql in alter_statements:
            if col_name not in existing_columns:
                try:
                    cursor.execute(alter_sql)
                    print(f"✓ Added column: {col_name}")
                except Error as e:
                    print(f"✗ Error adding column {col_name}: {e}")
            else:
                print(f"• Column {col_name} already exists")
        
        connection.commit()
        
        # Verify final structure
        cursor.execute("DESCRIBE equipment_returns")
        print("\n✓ Final table structure:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]}")
        
        cursor.close()
except Error as e:
    print(f"Error connecting to database: {e}")
finally:
    if connection.is_connected():
        connection.close()
        print("\n✓ Database connection closed")

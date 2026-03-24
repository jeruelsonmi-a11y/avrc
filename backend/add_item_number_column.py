"""
Migration script to add item_number column to equipment_returns table if it doesn't exist
"""
import mysql.connector
from mysql.connector import Error

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'avrc_db'
}

def add_item_number_column():
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        
        # Check if column exists
        check_column_query = """
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'equipment_returns' 
            AND COLUMN_NAME = 'item_number'
        """
        
        cursor.execute(check_column_query)
        result = cursor.fetchone()
        
        if result:
            print("✓ Column 'item_number' already exists in equipment_returns table")
        else:
            # Add the column
            print("Adding 'item_number' column to equipment_returns table...")
            alter_table_query = """
                ALTER TABLE equipment_returns 
                ADD COLUMN item_number VARCHAR(100) 
                AFTER equipment_name
            """
            cursor.execute(alter_table_query)
            connection.commit()
            print("✓ Successfully added 'item_number' column to equipment_returns table")
        
        cursor.close()
        connection.close()
        
    except Error as err:
        if err.errno == 2003:
            print(f"✗ Cannot connect to MySQL Server: {err}")
        elif err.errno == 1045:
            print(f"✗ Access denied - check database credentials: {err}")
        else:
            print(f"✗ Error: {err}")
    except Exception as err:
        print(f"✗ Unexpected error: {err}")

if __name__ == "__main__":
    add_item_number_column()

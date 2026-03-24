"""
Migration script to create equipment_reservations and room_reservations
and copy existing rows from reservations table into the new tables.
It will NOT drop the original reservations table.
"""
from sqlalchemy import text
from database import engine


def migrate():
    with engine.connect() as conn:
        try:
            # Create equipment_reservations table if not exists
            result = conn.execute(text("SHOW TABLES LIKE 'equipment_reservations'"))
            if not result.fetchone():
                print('Creating equipment_reservations table...')
                conn.execute(text('''
                    CREATE TABLE equipment_reservations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        item_id INT NOT NULL,
                        date_needed VARCHAR(20) NOT NULL,
                        time_from VARCHAR(10) NULL,
                        purpose VARCHAR(1024) NULL,
                        status VARCHAR(30) DEFAULT 'Pending',
                        user_id INT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
                print('✓ equipment_reservations created')
            else:
                print('equipment_reservations already exists')

            # Create room_reservations table if not exists
            result = conn.execute(text("SHOW TABLES LIKE 'room_reservations'"))
            if not result.fetchone():
                print('Creating room_reservations table...')
                conn.execute(text('''
                    CREATE TABLE room_reservations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        item_id INT NOT NULL,
                        date_needed VARCHAR(20) NOT NULL,
                        time_from VARCHAR(10) NULL,
                        time_to VARCHAR(10) NULL,
                        purpose VARCHAR(1024) NULL,
                        status VARCHAR(30) DEFAULT 'Pending',
                        user_id INT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                '''))
                print('✓ room_reservations created')
            else:
                print('room_reservations already exists')

            # Copy data from reservations table into new tables
            # equipment rows -> equipment_reservations
            print('Migrating equipment reservations...')
            conn.execute(text('''
                INSERT INTO equipment_reservations (id, item_id, date_needed, time_from, purpose, status, user_id, created_at)
                SELECT id, item_id, date_needed, time_from, purpose, status, user_id, created_at
                FROM reservations WHERE item_type = 'equipment'
                ON DUPLICATE KEY UPDATE id = id
            '''))
            print('✓ equipment migration done')

            # room rows -> room_reservations
            print('Migrating room reservations...')
            conn.execute(text('''
                INSERT INTO room_reservations (id, item_id, date_needed, time_from, time_to, purpose, status, user_id, created_at)
                SELECT id, item_id, date_needed, time_from, time_to, purpose, status, user_id, created_at
                FROM reservations WHERE item_type = 'room'
                ON DUPLICATE KEY UPDATE id = id
            '''))
            print('✓ room migration done')

            conn.commit()
            print('Migration completed. NOTE: old `reservations` table was not dropped.')
        except Exception as e:
            print('Migration error:', e)
            conn.rollback()
            raise


if __name__ == '__main__':
    migrate()

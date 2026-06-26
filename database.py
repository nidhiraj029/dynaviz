import json
import datetime
from sqlalchemy import create_engine, Column, String, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database configuration
DATABASE_URL = "sqlite:///./dynaviz.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class MazeModel(Base):
    __tablename__ = "mazes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    grid_width = Column(Integer, nullable=False)
    grid_height = Column(Integer, nullable=False)
    start_node = Column(String, nullable=False)  # JSON string: "[row, col]"
    target_node = Column(String, nullable=False) # JSON string: "[row, col]"
    walls = Column(String, nullable=False)       # JSON string: "[[r, c], ...]"
    weights = Column(String, nullable=False)     # JSON string: "[[r, c, w], ...]"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def fetch_all_mazes():
    db = SessionLocal()
    try:
        mazes = db.query(MazeModel).order_by(MazeModel.created_at.desc()).all()
        result = []
        for maze in mazes:
            result.append({
                "id": maze.id,
                "name": maze.name,
                "grid_width": maze.grid_width,
                "grid_height": maze.grid_height,
                "start_node": json.loads(maze.start_node),
                "target_node": json.loads(maze.target_node),
                "walls": json.loads(maze.walls),
                "weights": json.loads(maze.weights),
                "created_at": maze.created_at.isoformat()
            })
        return result
    finally:
        db.close()

def create_maze(maze_data: dict):
    db = SessionLocal()
    try:
        db_maze = MazeModel(
            id=maze_data["id"],
            name=maze_data["name"],
            grid_width=maze_data["grid_width"],
            grid_height=maze_data["grid_height"],
            start_node=json.dumps(maze_data["start_node"]),
            target_node=json.dumps(maze_data["target_node"]),
            walls=json.dumps(maze_data["walls"]),
            weights=json.dumps(maze_data["weights"])
        )
        db.add(db_maze)
        db.commit()
        db.refresh(db_maze)
        return True
    except Exception as e:
        db.rollback()
        print(f"Error saving maze: {e}")
        return False
    finally:
        db.close()

def remove_maze(maze_id: str):
    db = SessionLocal()
    try:
        maze = db.query(MazeModel).filter(MazeModel.id == maze_id).first()
        if maze:
            db.delete(maze)
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        print(f"Error deleting maze: {e}")
        return False
    finally:
        db.close()

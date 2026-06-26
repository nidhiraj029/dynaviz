<img width="167" height="57" alt="image" src="https://github.com/user-attachments/assets/a3047248-f560-4bc7-9ef5-2b734fdf3811" />


<img width="100" height="100" alt="giphy" src="https://github.com/user-attachments/assets/c490f3a8-2bdf-4253-994a-0465db79a4e1" />


# DynaViz — Interactive Pathfinding & Maze Sandbox

DynaViz is a high-performance interactive sandbox web application designed to visualize, compare, and benchmark pathfinding algorithms and randomized maze generators.

Built with a **FastAPI** backend and a responsive, glassmorphic **Vanilla JS/CSS** frontend.

---
<img width="1880" height="883" alt="image" src="https://github.com/user-attachments/assets/0c5d4d67-e888-41bb-a769-6de8f33f2c4f" />


https://github.com/user-attachments/assets/5288b9fa-c4ea-4b9f-bc2e-fcb9b9f2b0e2



## 🚀 Key Features

* **Side-by-Side Comparison Mode**: Visualize two different algorithms running simultaneously on the same grid layout to compare search space and behaviors.
* **Interactive Grid Canvas**: Draw custom walls and weighted "mud" regions (movement cost of 5) using interactive brush painting.
* **Full Benchmark Board**: Run all 6 pathfinding algorithms concurrently and view a performance leaderboard (execution time, path cost, nodes visited, peak frontier, branching factor).
* **Maze Generators**: Generate perfect mazes instantly using randomized algorithms.
* **Persistent Layouts**: Save your grid configuration with a custom name to a local SQLite database to load or delete it later.

---

## 🧠 Supported Algorithms

### Pathfinding Solvers
* **A\* Search** (with Manhattan, Euclidean, and Chebyshev heuristics)
* **Greedy Best-First Search (GBFS)**
* **Dijkstra's Algorithm**
* **Breadth-First Search (BFS)**
* **Depth-First Search (DFS)**
* **Bidirectional BFS**

### Maze Generation Algorithms
* **Recursive Backtracking** (DFS-based)
* **Randomized Prim's Algorithm**
* **Randomized Kruskal's Algorithm**

---

## 🛠️ Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/dynaviz.git
   cd dynaviz
   ```

2. **Set up a Virtual Environment**:
   ```bash
   python -m venv .venv
   # On Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source .venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Application**:
   ```bash
   python -m uvicorn main:app --reload
   ```
   Open [http://localhost:8000](http://localhost:8000) in your web browser.

---

## 🧪 Running Tests

To verify pathfinder and maze solver correctness, run the test suite:
```bash
pytest
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

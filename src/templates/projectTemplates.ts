import { GRAPHICS_H_CONTENT } from './graphicsHeader'

export interface TemplateFile {
    path: string // Relative path inside project (e.g. "include/Calculator.h", "src/main.cpp")
    content: string
}

export interface ProjectTemplate {
    id: string
    name: string
    category: 'C++' | 'Game Dev' | 'Python' | 'Java'
    language: 'cpp' | 'python' | 'java'
    icon: string
    description: string
    defaultProjectName: string
    primaryFile: string // Relative path to main file to open upon creation
    files: TemplateFile[]
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'cpp-oop',
        name: 'C++ OOP Package',
        category: 'C++',
        language: 'cpp',
        icon: '🔷',
        description: 'Modern Object-Oriented C++ structure with header guards (#ifndef), separate implementation files, and a test driver.',
        defaultProjectName: 'CppOopProject',
        primaryFile: 'src/main.cpp',
        files: [
            {
                path: 'include/Calculator.h',
                content: `#ifndef CALCULATOR_H
#define CALCULATOR_H

#include <string>
#include <vector>

/**
 * @brief Calculator class demonstrating modern C++ OOP principles:
 * encapsulation, private state, const correctness, and clean interfaces.
 */
class Calculator {
private:
    double lastResult;
    std::vector<std::string> history;

public:
    Calculator();
    ~Calculator() = default;

    double add(double a, double b);
    double subtract(double a, double b);
    double multiply(double a, double b);
    double divide(double a, double b);

    double getLastResult() const;
    void printHistory() const;
    void clear();
};

#endif // CALCULATOR_H
`
            },
            {
                path: 'src/Calculator.cpp',
                content: `#include "Calculator.h"
#include <iostream>
#include <stdexcept>
#include <sstream>

Calculator::Calculator() : lastResult(0.0) {}

double Calculator::add(double a, double b) {
    lastResult = a + b;
    std::ostringstream ss;
    ss << a << " + " << b << " = " << lastResult;
    history.push_back(ss.str());
    return lastResult;
}

double Calculator::subtract(double a, double b) {
    lastResult = a - b;
    std::ostringstream ss;
    ss << a << " - " << b << " = " << lastResult;
    history.push_back(ss.str());
    return lastResult;
}

double Calculator::multiply(double a, double b) {
    lastResult = a * b;
    std::ostringstream ss;
    ss << a << " * " << b << " = " << lastResult;
    history.push_back(ss.str());
    return lastResult;
}

double Calculator::divide(double a, double b) {
    if (b == 0.0) {
        throw std::invalid_argument("Division by zero is undefined.");
    }
    lastResult = a / b;
    std::ostringstream ss;
    ss << a << " / " << b << " = " << lastResult;
    history.push_back(ss.str());
    return lastResult;
}

double Calculator::getLastResult() const {
    return lastResult;
}

void Calculator::printHistory() const {
    std::cout << "\\n--- Calculation History (" << history.size() << " operations) ---\\n";
    for (size_t i = 0; i < history.size(); ++i) {
        std::cout << "  [" << (i + 1) << "] " << history[i] << "\\n";
    }
}

void Calculator::clear() {
    lastResult = 0.0;
    history.clear();
}
`
            },
            {
                path: 'src/main.cpp',
                content: `#include <iostream>
#include "Calculator.h"

int main() {
    std::cout << "=======================================\\n";
    std::cout << "   CarbonCode C++ OOP Starter Project  \\n";
    std::cout << "=======================================\\n\\n";

    Calculator calc;

    std::cout << "Running mathematical calculations:\\n";
    std::cout << "15.5 + 4.5  = " << calc.add(15.5, 4.5) << "\\n";
    std::cout << "100.0 - 27.5 = " << calc.subtract(100.0, 27.5) << "\\n";
    std::cout << "12.0 * 8.0  = " << calc.multiply(12.0, 8.0) << "\\n";
    std::cout << "144.0 / 12.0 = " << calc.divide(144.0, 12.0) << "\\n";

    try {
        std::cout << "Testing division by zero handling:\\n";
        calc.divide(42.0, 0.0);
    } catch (const std::invalid_argument& ex) {
        std::cerr << "  Caught expected exception: " << ex.what() << "\\n";
    }

    calc.printHistory();

    std::cout << "\\nProgram completed successfully! Press F5 to compile and rerun anytime.\\n";
    return 0;
}
`
            },
            {
                path: 'tests/test_calculator.cpp',
                content: `#include <iostream>
#include <cassert>
#include <cmath>
#include "Calculator.h"

int main() {
    std::cout << "Running Unit Tests for Calculator class...\\n";

    Calculator calc;
    assert(calc.add(2.0, 3.0) == 5.0);
    assert(calc.subtract(10.0, 4.0) == 6.0);
    assert(calc.multiply(3.0, 7.0) == 21.0);
    assert(calc.divide(20.0, 4.0) == 5.0);

    bool threw = false;
    try {
        calc.divide(1.0, 0.0);
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    assert(threw);

    std::cout << "[PASS] All 5 Calculator test assertions passed!\\n";
    return 0;
}
`
            },
            {
                path: 'Makefile',
                content: `CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -Iinclude

SRCS = src/main.cpp src/Calculator.cpp
TEST_SRCS = tests/test_calculator.cpp src/Calculator.cpp
TARGET = app.exe
TEST_TARGET = test_runner.exe

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET)

test: $(TEST_TARGET)
	./$(TEST_TARGET)

$(TEST_TARGET): $(TEST_SRCS)
	$(CXX) $(CXXFLAGS) $(TEST_SRCS) -o $(TEST_TARGET)

clean:
	rm -f $(TARGET) $(TEST_TARGET) *.o
`
            },
            {
                path: 'README.md',
                content: `# C++ OOP Starter Project

A clean, modular Object-Oriented C++ project template configured for CarbonCode.

## Directory Structure
- \`include/\`: Header files (\`.h\`) containing class declarations and include guards.
- \`src/\`: Implementation files (\`.cpp\`) and program entry point (\`main.cpp\`).
- \`tests/\`: Standalone test suite verifying business logic.
- \`Makefile\`: Command-line build definition.

## Running in CarbonCode
1. Open \`src/main.cpp\`.
2. Press **F5** or click **Run** in the toolbar. CarbonCode automatically compiles all project sources with \`-Iinclude\`.
`
            },
            {
                path: '.carboncode',
                content: `{\n  "language": "cpp",\n  "cppStandard": "c++17"\n}\n`
            }
        ]
    },
    {
        id: 'cpp-game',
        name: '🎮 2D Beginner Graphics & Game',
        category: 'Game Dev',
        language: 'cpp',
        icon: '🎮',
        description: 'Zero-setup 2D graphics engine. Playable arcade game with 60 FPS physics, player controls, and falling gem collectibles (no external DLLs required).',
        defaultProjectName: 'My2DGame',
        primaryFile: 'src/main.cpp',
        files: [
            {
                path: 'include/graphics.h',
                content: GRAPHICS_H_CONTENT
            },
            {
                path: 'include/game.h',
                content: `#ifndef GAME_H
#define GAME_H

#include <vector>

const int SCREEN_WIDTH = 800;
const int SCREEN_HEIGHT = 600;
const float TARGET_FPS = 60.0f;

struct Vector2D {
    float x;
    float y;
};

struct Player {
    Vector2D position;
    Vector2D velocity;
    float radius;
    float speed;
    int score;
};

struct Collectible {
    Vector2D position;
    float radius;
    bool active;
};

class GameEngine {
private:
    Player player;
    std::vector<Collectible> collectibles;
    bool isRunning;
    int tickCount;

public:
    GameEngine();
    void init();
    void handleInput(float moveX, float moveY);
    void update(float deltaTime);
    void renderAsciiFrame() const;
    bool running() const { return isRunning; }
    int getScore() const { return player.score; }
    const Player& getPlayer() const { return player; }
    const std::vector<Collectible>& getCollectibles() const { return collectibles; }
};

#endif // GAME_H
`
            },
            {
                path: 'src/game.cpp',
                content: `#include "game.h"
#include <iostream>
#include <cmath>
#include <cstdlib>

GameEngine::GameEngine() : isRunning(true), tickCount(0) {
    init();
}

void GameEngine::init() {
    player.position = { SCREEN_WIDTH / 2.0f, SCREEN_HEIGHT - 65.0f };
    player.velocity = { 0.0f, 0.0f };
    player.radius = 24.0f;
    player.speed = 380.0f;
    player.score = 0;

    collectibles.clear();
    for (int i = 0; i < 7; ++i) {
        Collectible c;
        c.position = {
            static_cast<float>(50 + (rand() % (SCREEN_WIDTH - 100))),
            static_cast<float>(rand() % (SCREEN_HEIGHT / 2))
        };
        c.radius = 12.0f;
        c.active = true;
        collectibles.push_back(c);
    }
}

void GameEngine::handleInput(float moveX, float moveY) {
    player.velocity.x = moveX * player.speed;
    player.velocity.y = moveY * player.speed;
}

void GameEngine::update(float deltaTime) {
    tickCount++;

    // Update player position with deltaTime
    player.position.x += player.velocity.x * deltaTime;
    player.position.y += player.velocity.y * deltaTime;

    // Boundary constraints
    if (player.position.x < player.radius) player.position.x = player.radius;
    if (player.position.x > SCREEN_WIDTH - player.radius) player.position.x = SCREEN_WIDTH - player.radius;
    if (player.position.y < player.radius) player.position.y = player.radius;
    if (player.position.y > SCREEN_HEIGHT - player.radius) player.position.y = SCREEN_HEIGHT - player.radius;

    // Check collision with collectibles
    for (auto& item : collectibles) {
        if (!item.active) continue;
        float dx = player.position.x - item.position.x;
        float dy = player.position.y - item.position.y;
        float dist = std::sqrt(dx * dx + dy * dy);
        if (dist < (player.radius + item.radius)) {
            item.active = false;
            player.score += 10;
        }
    }
}

void GameEngine::renderAsciiFrame() const {
    std::cout << "[Frame " << tickCount << "] "
              << "Player: (" << static_cast<int>(player.position.x) << ", "
              << static_cast<int>(player.position.y) << ") | Score: "
              << player.score << "\\n";
}
`
            },
            {
                path: 'src/main.cpp',
                content: `#include <iostream>
#include <chrono>
#include <thread>
#include "game.h"
#include "graphics.h"

int main() {
    // 1. Initialize hardware-native 2D window (Zero DLLs needed)
    InitWindow(SCREEN_WIDTH, SCREEN_HEIGHT, "CarbonCode 2D Arcade - Zero Setup Graphics");
    SetTargetFPS(60);

    GameEngine game;
    const float dt = 1.0f / TARGET_FPS;

    // 2. Main 60 FPS Game Loop
    while (!WindowShouldClose()) {
        float moveX = 0.0f;
        float moveY = 0.0f;

        // Player Controls
        if (IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A)) moveX -= 1.0f;
        if (IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D)) moveX += 1.0f;
        if (IsKeyDown(KEY_UP) || IsKeyDown(KEY_W)) moveY -= 1.0f;
        if (IsKeyDown(KEY_DOWN) || IsKeyDown(KEY_S)) moveY += 1.0f;

        game.handleInput(moveX, moveY);
        game.update(dt);

        // 3. Render Frame
        BeginDrawing();
        ClearBackground(RAYWHITE);

        // Draw Collectible Gems
        for (const auto& item : game.getCollectibles()) {
            if (item.active) {
                DrawCircle(static_cast<int>(item.position.x), static_cast<int>(item.position.y), static_cast<int>(item.radius), GOLD);
                DrawCircleLines(static_cast<int>(item.position.x), static_cast<int>(item.position.y), static_cast<int>(item.radius), ORANGE);
            }
        }

        // Draw Player Ship / Orb
        const auto& p = game.getPlayer();
        DrawCircle(static_cast<int>(p.position.x), static_cast<int>(p.position.y), static_cast<int>(p.radius), SKYBLUE);
        DrawCircle(static_cast<int>(p.position.x), static_cast<int>(p.position.y), static_cast<int>(p.radius * 0.65f), BLUE);
        DrawCircleLines(static_cast<int>(p.position.x), static_cast<int>(p.position.y), static_cast<int>(p.radius), DARKBLUE);

        // Header HUD
        DrawRectangle(0, 0, SCREEN_WIDTH, 44, DARKBLUE);
        DrawText("🎮 CarbonCode 2D Arcade", 20, 12, 20, WHITE);

        char scoreText[64];
        sprintf(scoreText, "Score: %d pts", game.getScore());
        DrawText(scoreText, SCREEN_WIDTH - 180, 12, 20, YELLOW);

        // Footer prompt
        DrawText("Use Arrow Keys (or WASD) to catch the golden stars! Press Esc to exit.", 20, SCREEN_HEIGHT - 28, 15, DARKGRAY);

        EndDrawing();
    }

    CloseWindow();
    return 0;
}
`
            },
            {
                path: 'README.md',
                content: `# 🎮 2D Beginner Graphics & Game

A zero-setup hardware-native 2D game project pre-bundled with CarbonCode.

## Zero Setup Required
- **No external DLLs**: Uses native Win32 GDI with smooth 60 FPS double-buffering.
- **Raylib-compatible syntax**: \`InitWindow()\`, \`BeginDrawing()\`, \`DrawCircle()\`, \`DrawRectangle()\`, \`IsKeyDown()\`.
- **Instant F5 Run**: Press F5 to immediately compile and pop up the game window.
`
            },
            {
                path: '.carboncode',
                content: `{\n  "language": "cpp",\n  "cppStandard": "c++17"\n}\n`
            }
        ]
    },
    {
        id: 'cpp-turtle',
        name: '🐢 Turtle Graphics Art',
        category: 'Game Dev',
        language: 'cpp',
        icon: '🐢',
        description: 'Python-style Turtle Graphics in C++. Draw mesmerizing geometric mandalas and colorful algorithmic art with forward() and left() commands.',
        defaultProjectName: 'TurtleArt',
        primaryFile: 'src/main.cpp',
        files: [
            {
                path: 'include/graphics.h',
                content: GRAPHICS_H_CONTENT
            },
            {
                path: 'src/main.cpp',
                content: `#include "graphics.h"

int main() {
    // 1. Initialize Turtle Graphics window (800x600)
    TurtleInit(800, 600, "CarbonCode Turtle Art - Algorithmic Mandala");

    Color colors[] = { RED, ORANGE, GOLD, GREEN, SKYBLUE, PURPLE, MAGENTA };
    int numColors = 7;

    TurtleSpeed(9); // Drawing speed (1..10)
    pensize(2);

    // 2. Draw a geometric spiral mandala
    for (int i = 0; i < 180; ++i) {
        pencolor(colors[i % numColors]);
        forward(i * 2.2);
        left(59); // Algorithmic geometric turn angle
    }

    // 3. Keep art window displayed until closed by user
    TurtleDone();
    return 0;
}
`
            },
            {
                path: 'README.md',
                content: `# 🐢 Turtle Graphics in C++

Python-style Turtle Graphics brought to C++ with zero external libraries.

## Available Functions
- \`forward(distance)\`, \`backward(distance)\`
- \`left(angle)\`, \`right(angle)\`
- \`pencolor(RED)\`, \`pensize(pixels)\`
- \`penup()\`, \`pendown()\`
- \`circle(radius)\`
- \`TurtleDone()\`
`
            },
            {
                path: '.carboncode',
                content: `{\n  "language": "cpp",\n  "cppStandard": "c++17"\n}\n`
            }
        ]
    },
    {
        id: 'python-modular',
        name: 'Python Modular Project',
        category: 'Python',
        language: 'python',
        icon: '🐍',
        description: 'Production-ready Python package structure with src/ architecture, virtual environment setup, and unittest suite.',
        defaultProjectName: 'PythonModularApp',
        primaryFile: 'main.py',
        files: [
            {
                path: 'src/math_suite/__init__.py',
                content: `"""
MathSuite Package - Modular Python starter configured for CarbonCode.
"""

from .calculator import AdvancedCalculator
from .utils import format_currency, compute_statistics

__version__ = "1.0.0"
__all__ = ["AdvancedCalculator", "format_currency", "compute_statistics"]
`
            },
            {
                path: 'src/math_suite/calculator.py',
                content: `from typing import List, Union

class AdvancedCalculator:
    """An encapsulated calculator providing arithmetic and statistical capabilities."""

    def __init__(self, precision: int = 2):
        self.precision = precision
        self.history: List[str] = []

    def add(self, a: float, b: float) -> float:
        res = round(a + b, self.precision)
        self.history.append(f"{a} + {b} = {res}")
        return res

    def multiply(self, a: float, b: float) -> float:
        res = round(a * b, self.precision)
        self.history.append(f"{a} * {b} = {res}")
        return res

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero in AdvancedCalculator.")
        res = round(a / b, self.precision)
        self.history.append(f"{a} / {b} = {res}")
        return res

    def average(self, numbers: List[Union[int, float]]) -> float:
        if not numbers:
            return 0.0
        return round(sum(numbers) / len(numbers), self.precision)
`
            },
            {
                path: 'src/math_suite/utils.py',
                content: `from typing import List, Dict, Union

def format_currency(amount: float, currency_symbol: str = "$") -> str:
    """Format a float amount as currency with two decimal places."""
    return f"{currency_symbol}{amount:,.2f}"

def compute_statistics(values: List[Union[int, float]]) -> Dict[str, float]:
    """Compute basic descriptive statistics for a list of values."""
    if not values:
        return {"count": 0, "min": 0, "max": 0, "total": 0}
    return {
        "count": len(values),
        "min": min(values),
        "max": max(values),
        "total": sum(values)
    }
`
            },
            {
                path: 'main.py',
                content: `import sys
import os

# Ensure src/ is on the Python module search path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from math_suite import AdvancedCalculator, format_currency, compute_statistics

def main():
    print("=" * 45)
    print("   CarbonCode Modular Python Project")
    print("=" * 45)

    calc = AdvancedCalculator(precision=2)

    print("\\nPerforming Calculations:")
    print("  125.45 + 87.20 =", calc.add(125.45, 87.20))
    print("  15.0 * 8.5     =", calc.multiply(15.0, 8.5))
    print("  250.0 / 4.0    =", calc.divide(250.0, 4.0))

    data_sample = [12.5, 45.0, 88.2, 104.5, 33.1]
    stats = compute_statistics(data_sample)
    print("\\nDataset Statistics:")
    print(f"  Sample: {data_sample}")
    print(f"  Count:  {stats['count']}")
    print(f"  Total:  {format_currency(stats['total'])}")
    print(f"  Average: {format_currency(calc.average(data_sample))}")

    print("\\nCalculation History:")
    for item in calc.history:
        print(f"  • {item}")

    print("\\n✓ Project executed successfully! Press F5 to rerun anytime.")

if __name__ == '__main__':
    main()
`
            },
            {
                path: 'tests/test_calculator.py',
                content: `import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from math_suite.calculator import AdvancedCalculator
from math_suite.utils import format_currency

class TestCalculator(unittest.TestCase):
    def setUp(self):
        self.calc = AdvancedCalculator()

    def test_add(self):
        self.assertEqual(self.calc.add(10, 5), 15.0)

    def test_divide(self):
        self.assertEqual(self.calc.divide(20, 4), 5.0)

    def test_divide_zero(self):
        with self.assertRaises(ZeroDivisionError):
            self.calc.divide(10, 0)

    def test_format_currency(self):
        self.assertEqual(format_currency(1234.5), "$1,234.50")

if __name__ == '__main__':
    unittest.main()
`
            },
            {
                path: 'requirements.txt',
                content: `# Core project dependencies
# Add third-party packages below (e.g. numpy, requests, pytest)
`
            },
            {
                path: '.gitignore',
                content: `__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
env/
.pytest_cache/
*.egg-info/
dist/
build/
`
            },
            {
                path: 'README.md',
                content: `# Python Modular Project

A clean package architecture following standard Python packaging guidelines.

## Quick Start
1. Run \`main.py\` by pressing **F5** in CarbonCode.
2. Run unit tests in terminal:
\`\`\`bash
python -m unittest discover tests
\`\`\`
`
            },
            {
                path: '.carboncode',
                content: `{\\n  "language": "python"\\n}\\n`
            }
        ]
    },
    {
        id: 'java-standard',
        name: 'Java Standard Application',
        category: 'Java',
        language: 'java',
        icon: '☕',
        description: 'Package-aware Java application featuring domain models, service layers, clean encapsulation, and ready-to-run main class.',
        defaultProjectName: 'JavaAppProject',
        primaryFile: 'src/com/carboncode/app/Main.java',
        files: [
            {
                path: 'src/com/carboncode/app/model/Product.java',
                content: `package com.carboncode.app.model;

/**
 * Domain entity representing an inventory item.
 */
public class Product {
    private final int id;
    private String name;
    private double price;
    private int quantity;

    public Product(int id, String name, double price, int quantity) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.quantity = quantity;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public double getPrice() { return price; }
    public int getQuantity() { return quantity; }

    public double getTotalValue() {
        return price * quantity;
    }

    @Override
    public String toString() {
        return String.format("[%d] %-16s | Price: $%.2f | Stock: %d | Value: $%.2f",
                id, name, price, quantity, getTotalValue());
    }
}
`
            },
            {
                path: 'src/com/carboncode/app/service/ProductService.java',
                content: `package com.carboncode.app.service;

import com.carboncode.app.model.Product;
import java.util.ArrayList;
import java.util.List;

/**
 * Service managing inventory operations.
 */
public class ProductService {
    private final List<Product> products = new ArrayList<>();

    public void addProduct(Product product) {
        products.add(product);
    }

    public List<Product> getAllProducts() {
        return new ArrayList<>(products);
    }

    public double calculateTotalInventoryValue() {
        double total = 0.0;
        for (Product p : products) {
            total += p.getTotalValue();
        }
        return total;
    }
}
`
            },
            {
                path: 'src/com/carboncode/app/Main.java',
                content: `package com.carboncode.app;

import com.carboncode.app.model.Product;
import com.carboncode.app.service.ProductService;

public class Main {
    public static void main(String[] args) {
        System.out.println("=========================================");
        System.out.println("   CarbonCode Java Standard Application  ");
        System.out.println("=========================================");

        ProductService service = new ProductService();

        // Seed initial items
        service.addProduct(new Product(101, "Mechanical Keyboard", 89.99, 15));
        service.addProduct(new Product(102, "Wireless Mouse", 49.50, 30));
        service.addProduct(new Product(103, "UltraWide Monitor", 349.00, 8));
        service.addProduct(new Product(104, "USB-C Hub", 29.95, 45));

        System.out.println("\\nCurrent Inventory Catalog:");
        for (Product product : service.getAllProducts()) {
            System.out.println("  " + product);
        }

        double totalValue = service.calculateTotalInventoryValue();
        System.out.printf("\\nTotal Warehouse Value: $%.2f\\n", totalValue);
        System.out.println("\\nProgram completed successfully! Press F5 to rerun.");
    }
}
`
            },
            {
                path: 'README.md',
                content: `# Java Standard Application

A clean, package-aware Java project structure (\`com.carboncode.app\`) with domain models and services.

## Compiling & Running in CarbonCode
Open \`src/com/carboncode/app/Main.java\` and press **F5** or click **Run**. CarbonCode compiles the package hierarchy automatically.

## Command Line Build:
\`\`\`bash
javac -d bin -sourcepath src src/com/carboncode/app/Main.java
java -cp bin com.carboncode.app.Main
\`\`\`
`
            },
            {
                path: '.carboncode',
                content: `{\n  "language": "java"\n}\n`
            }
        ]
    }
]

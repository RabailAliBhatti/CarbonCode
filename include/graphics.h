/**
 * ============================================================================
 * CarbonCode Beginner 2D Graphics & Turtle Library (graphics.h)
 * ============================================================================
 * Zero-setup, hardware-native 2D windowing and graphics for C and C++ on Windows.
 * Powered by Win32 GDI with smooth double-buffering.
 * 100% Offline — Requires NO external DLLs or third-party libraries.
 *
 * Supported APIs:
 *   1. Raylib-style Game Loop:
 *      InitWindow(width, height, title)
 *      while (!WindowShouldClose()) {
 *          BeginDrawing();
 *          ClearBackground(RAYWHITE);
 *          DrawCircle(x, y, radius, RED);
 *          DrawRectangle(x, y, w, h, BLUE);
 *          DrawText("Hello World", x, y, 20, BLACK);
 *          EndDrawing();
 *      }
 *      CloseWindow();
 *
 *   2. Python-style Turtle Graphics:
 *      TurtleInit(800, 600, "Turtle Art");
 *      for (int i = 0; i < 36; i++) {
 *          forward(100);
 *          left(170);
 *      }
 *      TurtleDone();
 * ============================================================================
 */

#ifndef CARBONCODE_GRAPHICS_H
#define CARBONCODE_GRAPHICS_H

#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <cmath>
#include <cstring>
#include <chrono>
#include <thread>
#include <string>
#include <vector>

// ----------------------------------------------------------------------------
// Color Definition & Predefined Palette
// ----------------------------------------------------------------------------
struct Color {
    unsigned char r;
    unsigned char g;
    unsigned char b;
    unsigned char a;

    constexpr Color() : r(0), g(0), b(0), a(255) {}
    constexpr Color(unsigned char red, unsigned char green, unsigned char blue, unsigned char alpha = 255)
        : r(red), g(green), b(blue), a(alpha) {}
};

inline COLORREF ToCOLORREF(Color c) {
    return RGB(c.r, c.g, c.b);
}

// Raylib-compatible standard colors
static const Color LIGHTGRAY   = { 200, 200, 200, 255 };
static const Color GRAY        = { 130, 130, 130, 255 };
static const Color DARKGRAY    = { 80, 80, 80, 255 };
static const Color YELLOW      = { 253, 249, 0, 255 };
static const Color GOLD        = { 255, 203, 0, 255 };
static const Color ORANGE      = { 255, 161, 0, 255 };
static const Color PINK        = { 255, 109, 194, 255 };
static const Color RED         = { 230, 41, 55, 255 };
static const Color MAROON      = { 190, 33, 55, 255 };
static const Color GREEN       = { 0, 228, 48, 255 };
static const Color LIME        = { 0, 158, 47, 255 };
static const Color DARKGREEN   = { 0, 117, 44, 255 };
static const Color SKYBLUE     = { 102, 191, 255, 255 };
static const Color BLUE        = { 0, 121, 241, 255 };
static const Color DARKBLUE    = { 0, 82, 172, 255 };
static const Color PURPLE      = { 200, 122, 255, 255 };
static const Color VIOLET      = { 135, 60, 190, 255 };
static const Color DARKPURPLE  = { 112, 31, 126, 255 };
static const Color WHITE       = { 255, 255, 255, 255 };
static const Color BLACK       = { 0, 0, 0, 255 };
static const Color RAYWHITE    = { 245, 245, 245, 255 };
static const Color CYAN        = { 0, 255, 255, 255 };
static const Color MAGENTA     = { 255, 0, 255, 255 };

// Key Codes
enum KeyboardKey {
    KEY_SPACE       = VK_SPACE,
    KEY_ENTER       = VK_RETURN,
    KEY_ESCAPE      = VK_ESCAPE,
    KEY_LEFT        = VK_LEFT,
    KEY_UP          = VK_UP,
    KEY_RIGHT       = VK_RIGHT,
    KEY_DOWN        = VK_DOWN,
    KEY_W           = 'W',
    KEY_A           = 'A',
    KEY_S           = 'S',
    KEY_D           = 'D',
    KEY_R           = 'R',
    KEY_Q           = 'Q',
    KEY_E           = 'E'
};

// ----------------------------------------------------------------------------
// Internal Win32 State & Window Management
// ----------------------------------------------------------------------------
namespace CarbonGraphicsInternal {
    static HWND hwnd = NULL;
    static HDC hdcWindow = NULL;
    static HDC hdcMem = NULL;
    static HBITMAP hbmMem = NULL;
    static HBITMAP hbmOld = NULL;
    static int screenWidth = 800;
    static int screenHeight = 600;
    static bool shouldClose = false;
    static int targetFPS = 60;
    static std::chrono::steady_clock::time_point frameStartTime;
    static std::chrono::steady_clock::time_point appStartTime;
    static int mouseX = 0;
    static int mouseY = 0;
    static bool mouseButtons[3] = { false, false, false };

    static LRESULT CALLBACK WndProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
        switch (msg) {
            case WM_DESTROY:
                shouldClose = true;
                PostQuitMessage(0);
                return 0;
            case WM_CLOSE:
                shouldClose = true;
                DestroyWindow(hWnd);
                return 0;
            case WM_MOUSEMOVE:
                mouseX = LOWORD(lParam);
                mouseY = HIWORD(lParam);
                return 0;
            case WM_LBUTTONDOWN:
                mouseButtons[0] = true;
                return 0;
            case WM_LBUTTONUP:
                mouseButtons[0] = false;
                return 0;
            case WM_RBUTTONDOWN:
                mouseButtons[1] = true;
                return 0;
            case WM_RBUTTONUP:
                mouseButtons[1] = false;
                return 0;
            case WM_KEYDOWN:
                if (wParam == VK_ESCAPE) {
                    shouldClose = true;
                }
                return 0;
            case WM_PAINT: {
                PAINTSTRUCT ps;
                HDC hdc = BeginPaint(hWnd, &ps);
                if (hdcMem) {
                    BitBlt(hdc, 0, 0, screenWidth, screenHeight, hdcMem, 0, 0, SRCCOPY);
                }
                EndPaint(hWnd, &ps);
                return 0;
            }
        }
        return DefWindowProc(hWnd, msg, wParam, lParam);
    }
}

// ----------------------------------------------------------------------------
// Core Raylib-style Window & Drawing API
// ----------------------------------------------------------------------------

inline void InitWindow(int width, int height, const char* title = "CarbonCode 2D Game") {
    using namespace CarbonGraphicsInternal;
    screenWidth = width;
    screenHeight = height;
    shouldClose = false;
    appStartTime = std::chrono::steady_clock::now();

    HINSTANCE hInstance = GetModuleHandle(NULL);
    const char* CLASS_NAME = "CarbonCodeGraphicsWindow";

    WNDCLASSA wc = {};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
    RegisterClassA(&wc);

    RECT wr = { 0, 0, width, height };
    AdjustWindowRect(&wr, WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX, FALSE);

    hwnd = CreateWindowExA(
        0,
        CLASS_NAME,
        title,
        WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX | WS_VISIBLE,
        CW_USEDEFAULT, CW_USEDEFAULT,
        wr.right - wr.left, wr.bottom - wr.top,
        NULL, NULL, hInstance, NULL
    );

    hdcWindow = GetDC(hwnd);
    hdcMem = CreateCompatibleDC(hdcWindow);
    hbmMem = CreateCompatibleBitmap(hdcWindow, width, height);
    hbmOld = (HBITMAP)SelectObject(hdcMem, hbmMem);

    // Initial clear
    RECT fullRect = { 0, 0, width, height };
    HBRUSH bgBrush = CreateSolidBrush(RGB(245, 245, 245));
    FillRect(hdcMem, &fullRect, bgBrush);
    DeleteObject(bgBrush);

    ShowWindow(hwnd, SW_SHOW);
    UpdateWindow(hwnd);
}

inline bool WindowShouldClose() {
    using namespace CarbonGraphicsInternal;
    MSG msg;
    while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
        if (msg.message == WM_QUIT) {
            shouldClose = true;
        }
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    return shouldClose;
}

inline void CloseWindow() {
    using namespace CarbonGraphicsInternal;
    if (hdcMem) {
        SelectObject(hdcMem, hbmOld);
        DeleteObject(hbmMem);
        DeleteDC(hdcMem);
        hdcMem = NULL;
    }
    if (hdcWindow && hwnd) {
        ReleaseDC(hwnd, hdcWindow);
        hdcWindow = NULL;
    }
    if (hwnd) {
        DestroyWindow(hwnd);
        hwnd = NULL;
    }
}

inline void SetTargetFPS(int fps) {
    if (fps > 0) CarbonGraphicsInternal::targetFPS = fps;
}

inline void BeginDrawing() {
    using namespace CarbonGraphicsInternal;
    frameStartTime = std::chrono::steady_clock::now();
}

inline void EndDrawing() {
    using namespace CarbonGraphicsInternal;
    if (hdcWindow && hdcMem) {
        BitBlt(hdcWindow, 0, 0, screenWidth, screenHeight, hdcMem, 0, 0, SRCCOPY);
    }

    // Framerate limit delay
    if (targetFPS > 0) {
        auto frameEndTime = std::chrono::steady_clock::now();
        std::chrono::duration<double, std::milli> elapsed = frameEndTime - frameStartTime;
        double targetFrameTime = 1000.0 / targetFPS;
        if (elapsed.count() < targetFrameTime) {
            int sleepMs = static_cast<int>(targetFrameTime - elapsed.count());
            if (sleepMs > 0) {
                std::this_thread::sleep_for(std::chrono::milliseconds(sleepMs));
            }
        }
    }
}

inline void ClearBackground(Color color) {
    using namespace CarbonGraphicsInternal;
    if (!hdcMem) return;
    RECT rect = { 0, 0, screenWidth, screenHeight };
    HBRUSH brush = CreateSolidBrush(ToCOLORREF(color));
    FillRect(hdcMem, &rect, brush);
    DeleteObject(brush);
}

inline void DrawCircle(int centerX, int centerY, int radius, Color color) {
    using namespace CarbonGraphicsInternal;
    if (!hdcMem) return;
    HBRUSH brush = CreateSolidBrush(ToCOLORREF(color));
    HPEN pen = CreatePen(PS_SOLID, 1, ToCOLORREF(color));
    HBRUSH oldBrush = (HBRUSH)SelectObject(hdcMem, brush);
    HPEN oldPen = (HPEN)SelectObject(hdcMem, pen);

    Ellipse(hdcMem, centerX - radius, centerY - radius, centerX + radius, centerY + radius);

    SelectObject(hdcMem, oldBrush);
    SelectObject(hdcMem, oldPen);
    DeleteObject(brush);
    DeleteObject(pen);
}

inline void DrawCircleLines(int centerX, int centerY, int radius, Color color) {
    using namespace CarbonGraphicsInternal;
    if (!hdcMem) return;
    HBRUSH oldBrush = (HBRUSH)SelectObject(hdcMem, GetStockObject(NULL_BRUSH));
    HPEN pen = CreatePen(PS_SOLID, 2, ToCOLORREF(color));
    HPEN oldPen = (HPEN)SelectObject(hdcMem, pen);

    Ellipse(hdcMem, centerX - radius, centerY - radius, centerX + radius, centerY + radius);

    SelectObject(hdcMem, oldBrush);
    SelectObject(hdcMem, oldPen);
    DeleteObject(pen);
}

inline void DrawRectangle(int x, int y, int width, int height, Color color) {
    using namespace CarbonGraphicsInternal;
    if (!hdcMem) return;
    RECT rect = { x, y, x + width, y + height };
    HBRUSH brush = CreateSolidBrush(ToCOLORREF(color));
    FillRect(hdcMem, &rect, brush);
    DeleteObject(brush);
}

inline void DrawRectangleLines(int x, int y, int width, int height, Color color) {
    using namespace CarbonGraphicsInternal;
    if (!hdcMem) return;
    RECT rect = { x, y, x + width, y + height };
    HBRUSH brush = CreateSolidBrush(ToCOLORREF(color));
    FrameRect(hdcMem, &rect, brush);
    DeleteObject(brush);
}

inline void DrawLine(int startX, int startY, int endX, int endY, Color color) {
    using namespace CarbonGraphicsInternal;
    if (!hdcMem) return;
    HPEN pen = CreatePen(PS_SOLID, 2, ToCOLORREF(color));
    HPEN oldPen = (HPEN)SelectObject(hdcMem, pen);

    MoveToEx(hdcMem, startX, startY, NULL);
    LineTo(hdcMem, endX, endY);

    SelectObject(hdcMem, oldPen);
    DeleteObject(pen);
}

inline void DrawText(const char* text, int posX, int posY, int fontSize, Color color) {
    using namespace CarbonGraphicsInternal;
    if (!hdcMem || !text) return;
    HFONT font = CreateFontA(
        fontSize, 0, 0, 0, FW_BOLD, FALSE, FALSE, FALSE,
        ANSI_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        DEFAULT_QUALITY, DEFAULT_PITCH | FF_DONTCARE, "Segoe UI"
    );
    HFONT oldFont = (HFONT)SelectObject(hdcMem, font);
    SetTextColor(hdcMem, ToCOLORREF(color));
    SetBkMode(hdcMem, TRANSPARENT);

    TextOutA(hdcMem, posX, posY, text, static_cast<int>(strlen(text)));

    SelectObject(hdcMem, oldFont);
    DeleteObject(font);
}

inline bool IsKeyDown(int key) {
    return (GetAsyncKeyState(key) & 0x8000) != 0;
}

inline int GetMouseX() { return CarbonGraphicsInternal::mouseX; }
inline int GetMouseY() { return CarbonGraphicsInternal::mouseY; }
inline bool IsMouseButtonDown(int button) {
    if (button >= 0 && button < 3) return CarbonGraphicsInternal::mouseButtons[button];
    return false;
}

inline int GetScreenWidth() { return CarbonGraphicsInternal::screenWidth; }
inline int GetScreenHeight() { return CarbonGraphicsInternal::screenHeight; }

// ----------------------------------------------------------------------------
// Turtle Graphics Engine (Python-style Turtle in C++)
// ----------------------------------------------------------------------------
namespace CarbonTurtleInternal {
    static double turtleX = 400.0;
    static double turtleY = 300.0;
    static double turtleAngle = 0.0; // 0 is Right, 90 is Up, 180 is Left, 270 is Down
    static bool penDown = true;
    static Color penColor = BLACK;
    static int penWidth = 2;
    static int turtleSpeed = 6;
}

inline void TurtleInit(int width = 800, int height = 600, const char* title = "CarbonCode Turtle") {
    InitWindow(width, height, title);
    CarbonTurtleInternal::turtleX = width / 2.0;
    CarbonTurtleInternal::turtleY = height / 2.0;
    CarbonTurtleInternal::turtleAngle = 0.0;
    CarbonTurtleInternal::penDown = true;
    CarbonTurtleInternal::penColor = BLACK;
    CarbonTurtleInternal::penWidth = 2;
    ClearBackground(RAYWHITE);
    if (CarbonGraphicsInternal::hdcWindow && CarbonGraphicsInternal::hdcMem) {
        BitBlt(CarbonGraphicsInternal::hdcWindow, 0, 0, width, height, CarbonGraphicsInternal::hdcMem, 0, 0, SRCCOPY);
    }
}

inline void TurtlePenUp() { CarbonTurtleInternal::penDown = false; }
inline void TurtlePenDown() { CarbonTurtleInternal::penDown = true; }
inline void penup() { TurtlePenUp(); }
inline void pendown() { TurtlePenDown(); }

inline void TurtleColor(Color c) { CarbonTurtleInternal::penColor = c; }
inline void pencolor(Color c) { TurtleColor(c); }

inline void TurtleWidth(int w) { CarbonTurtleInternal::penWidth = w; }
inline void pensize(int w) { TurtleWidth(w); }

inline void TurtleSpeed(int s) { CarbonTurtleInternal::turtleSpeed = s; }

inline void TurtleRight(double angle) {
    CarbonTurtleInternal::turtleAngle -= angle;
    while (CarbonTurtleInternal::turtleAngle < 0.0) CarbonTurtleInternal::turtleAngle += 360.0;
}
inline void right(double angle) { TurtleRight(angle); }

inline void TurtleLeft(double angle) {
    CarbonTurtleInternal::turtleAngle += angle;
    while (CarbonTurtleInternal::turtleAngle >= 360.0) CarbonTurtleInternal::turtleAngle -= 360.0;
}
inline void left(double angle) { TurtleLeft(angle); }

inline void TurtleForward(double distance) {
    using namespace CarbonGraphicsInternal;
    using namespace CarbonTurtleInternal;
    if (!hdcMem) return;

    double rad = turtleAngle * (3.14159265358979323846 / 180.0);
    double newX = turtleX + distance * cos(rad);
    double newY = turtleY - distance * sin(rad); // screen Y is inverted

    if (penDown) {
        HPEN pen = CreatePen(PS_SOLID, penWidth, ToCOLORREF(penColor));
        HPEN oldPen = (HPEN)SelectObject(hdcMem, pen);
        MoveToEx(hdcMem, static_cast<int>(turtleX), static_cast<int>(turtleY), NULL);
        LineTo(hdcMem, static_cast<int>(newX), static_cast<int>(newY));
        SelectObject(hdcMem, oldPen);
        DeleteObject(pen);

        if (hdcWindow) {
            BitBlt(hdcWindow, 0, 0, screenWidth, screenHeight, hdcMem, 0, 0, SRCCOPY);
        }
        if (turtleSpeed > 0 && turtleSpeed < 10) {
            std::this_thread::sleep_for(std::chrono::milliseconds((10 - turtleSpeed) * 3));
        }
    }

    turtleX = newX;
    turtleY = newY;
    WindowShouldClose(); // pump events
}
inline void forward(double distance) { TurtleForward(distance); }

inline void TurtleBackward(double distance) {
    TurtleForward(-distance);
}
inline void backward(double distance) { TurtleBackward(distance); }

inline void TurtleGoto(double x, double y) {
    CarbonTurtleInternal::turtleX = x;
    CarbonTurtleInternal::turtleY = y;
}
inline void gotoXY(double x, double y) { TurtleGoto(x, y); }

inline void TurtleCircle(double radius) {
    int steps = 60;
    double stepDist = (2.0 * 3.14159265358979323846 * radius) / steps;
    double stepAngle = 360.0 / steps;
    for (int i = 0; i < steps; ++i) {
        TurtleForward(stepDist);
        TurtleLeft(stepAngle);
    }
}
inline void circle(double radius) { TurtleCircle(radius); }

inline void TurtleDone() {
    using namespace CarbonGraphicsInternal;
    if (hdcWindow && hdcMem) {
        BitBlt(hdcWindow, 0, 0, screenWidth, screenHeight, hdcMem, 0, 0, SRCCOPY);
    }
    while (!WindowShouldClose()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(16));
    }
    CloseWindow();
}

#endif // _WIN32
#endif // CARBONCODE_GRAPHICS_H


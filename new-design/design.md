# CarbonCode --- Dashboard Design Specification

## 1. Design Overview

CarbonCode is a lightweight desktop IDE for **C, C++, and Java**. The
dashboard should feel like a professional developer tool rather than a
generic application landing page.

The redesign keeps the existing functionality and information
architecture while completely modernizing the visual presentation.

### Design goals

-   Professional desktop IDE appearance
-   Dark-first developer-focused interface
-   Clear visual hierarchy
-   Fast access to New, Open, Save, and Run
-   Strong focus on the current language/compiler environment
-   Compact but useful dashboard information
-   Consistent spacing, typography, borders, icons, and states
-   Modern blue/indigo accent system without excessive visual noise
-   Responsive behavior for different desktop window sizes
-   Preserve all existing functionality

------------------------------------------------------------------------

# 2. Overall Layout

The application uses a **three-zone desktop layout**:

``` text
┌─────────────────────────────────────────────────────────────────────────────┐
│ CarbonCode title bar / window controls                                      │
├───────┬─────────────────────────────────────────────────────────────────────┤
│       │ Top command bar                                                     │
│ Side  │ New · Open · Save              Language · Standard             Run   │
│ Rail  ├───────────────────────────────────────┬─────────────────────────────┤
│       │                                       │                             │
│ Home  │        Main Dashboard                │       Right Sidebar          │
│ Editor│                                       │                             │
│ Files │  Welcome / Environment / Actions     │ Quick Info                   │
│       │  Keyboard Shortcuts                  │ Recent Files                 │
│Settings│                                      │ Code Faster                  │
│       │                                       │                             │
├───────┴───────────────────────────────────────┴─────────────────────────────┤
│ Status bar: status · file · language · compiler · execution time             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Main regions

1.  **Application title bar**
2.  **Primary command toolbar**
3.  **Left navigation rail**
4.  **Main dashboard content**
5.  **Right information sidebar**
6.  **Bottom status bar**

------------------------------------------------------------------------

# 3. Visual Direction

## Theme

The primary theme is a sophisticated dark interface.

### Base colors

``` text
App background:       #080D17
Secondary background: #0C1422
Surface:              #0F1929
Elevated surface:     #111D30
Border:               #203452
Border subtle:        #17263B

Primary accent:       #1688F5
Secondary accent:     #315FEA
Accent highlight:     #25B8FF

Primary text:         #F4F7FB
Secondary text:       #A9B7CC
Muted text:           #6F8099

Success:              #20D4B0
Warning:              #F4B740
Error:                #FF667A
```

These values are guidelines. The implementation may tune them slightly
to match the application framework and rendering environment.

## Background treatment

Avoid a completely flat black background.

Use:

-   Very subtle navy gradients
-   Low-opacity blue atmospheric shapes
-   Soft radial highlights behind important content
-   Minimal decorative curves in large hero surfaces

Decorative effects should never reduce readability.

------------------------------------------------------------------------

# 4. Typography

Use a modern UI/system font.

Preferred stack:

``` text
Inter,
Segoe UI,
SF Pro Display,
Roboto,
system-ui,
sans-serif
```

### Type scale

  Element                  Size   Weight
  ------------------ ---------- --------
  Application name     16--18px      600
  Hero heading         38--44px      700
  Hero subtitle        16--18px      400
  Section heading          16px      600
  Navigation item          14px      500
  Button label         14--15px      600
  Body text            13--14px      400
  Metadata                 12px      400
  Status bar           11--12px      400

The typography should feel compact enough for an IDE but spacious enough
to avoid visual fatigue.

------------------------------------------------------------------------

# 5. Application Title Bar

The title bar should be visually integrated into the application rather
than looking like a separate browser header.

### Left side

Display:

-   CarbonCode logo
-   `CarbonCode`

The logo is a small rounded square containing a `</>` symbol.

### Right side

Keep native desktop window controls:

-   Minimize
-   Maximize / Restore
-   Close

### Styling

-   Height: approximately 42--46px
-   Very dark navy background
-   Thin bottom border
-   Logo accent uses the CarbonCode blue gradient

------------------------------------------------------------------------

# 6. Primary Command Toolbar

Directly below the title bar.

### Left controls

``` text
☰   New   Open   Save
```

The menu icon opens the application's navigation or command menu.

Each action should include:

-   Icon
-   Text label
-   Hover state
-   Pressed state
-   Disabled state where applicable

### Center controls

Language and standard selectors:

``` text
Language   [ C++  ▾ ]

Standard   [ C++17 ▾ ]
```

These should look like compact IDE controls rather than large form
fields.

### Right control

Prominent **Run** button:

``` text
▶  Run
```

The Run button is the primary action in the toolbar.

### Run button behavior

Normal: - Blue gradient or blue filled surface - White icon/text

Hover: - Slightly brighter - Small elevation/shadow

Pressed: - Slightly darker - Reduced elevation

Running: - Replace Run icon with a progress indicator if supported -
Show appropriate execution state in the status bar

------------------------------------------------------------------------

# 7. Left Navigation Rail

The left rail provides persistent navigation.

Recommended width:

``` text
200–220px
```

### Navigation

``` text
⌂  Home
</> Editor
□  Files
⚙  Settings
```

### Active item

Home should have:

-   Blue-tinted background
-   Blue accent indicator
-   Bright icon
-   Bright text
-   Rounded corners

### Inactive item

Use:

-   Muted icon
-   Secondary text
-   Transparent background

Hover should introduce a subtle elevated surface.

### Bottom of navigation

Theme selector:

``` text
☾  Dark  ▾
```

Optionally include a small appearance icon.

------------------------------------------------------------------------

# 8. Main Dashboard

The dashboard is the primary working surface.

Recommended layout:

``` text
Main area
┌─────────────────────────────────────────────────────┐
│ Welcome hero                                        │
├─────────────────────────────────────────────────────┤
│ Environment cards                                   │
├─────────────────────────────────────────────────────┤
│ New File | Open File | Open Folder | Start Coding   │
├─────────────────────────────────────────────────────┤
│ Keyboard Shortcuts                                  │
└─────────────────────────────────────────────────────┘
```

The main content should occupy approximately **70--75%** of the usable
application width.

------------------------------------------------------------------------

# 9. Welcome Hero

The hero is the visual centerpiece.

### Content

Logo:

``` text
</>
```

Heading:

``` text
Welcome to CarbonCode
```

The word **CarbonCode** may use an accent gradient.

Subtitle:

``` text
A lightweight IDE for C, C++, and Java
```

Creator line:

``` text
Crafted by Rabail Ali Bhatti
```

### Hero visual

Use a dark navy surface with subtle blue curves/gradients.

Do not use a large photograph or unnecessary illustration.

### Recommended dimensions

-   Minimum height: 230px
-   Border radius: 12--16px
-   Internal padding: 32--40px

The hero should feel like part of the IDE rather than a marketing
banner.

------------------------------------------------------------------------

# 10. Development Environment Cards

Immediately below the hero.

Show the detected/configured development environments.

Example:

``` text
┌──────────────────────────────────┐
│ C++      C:\Users\...\carbon-... │
│                              ⧉   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Java     javac 17.0.18       ⧉   │
└──────────────────────────────────┘
```

### C++ card

Show:

-   C++ badge
-   Compiler/toolchain path
-   Copy button

### Java card

Show:

-   Java badge
-   `javac` version
-   Copy button

### Behavior

If a compiler is unavailable:

-   Show a warning state
-   Clearly explain the issue
-   Provide an appropriate settings/configuration action

Avoid exposing extremely long paths without truncation.

Use:

``` text
C:\Users\...\carbon-code\...
```

with a tooltip or expandable display for the complete path.

------------------------------------------------------------------------

# 11. Primary Dashboard Actions

Use four primary actions.

``` text
[ + New File ]   [ Open File ]   [ Open Folder ]   |   </> Start Coding
```

### New File

Primary blue action.

### Open File

Secondary outlined/elevated action.

### Open Folder

Secondary outlined/elevated action.

### Start Coding

A quieter text/icon action separated by a vertical divider.

### Interaction

Every action needs:

-   Hover
-   Press
-   Focus
-   Disabled
-   Keyboard shortcut tooltip where useful

------------------------------------------------------------------------

# 12. Keyboard Shortcuts Panel

The shortcuts panel should make the dashboard useful even before a
project is opened.

Title:

``` text
Keyboard Shortcuts
```

Optional action:

``` text
View All
```

Display six shortcuts in a 3 × 2 grid.

### Shortcuts

``` text
New File       Ctrl+N
Open File      Ctrl+O
Save           Ctrl+S
Save As        Ctrl+Shift+S
Run            F6
Quit           Ctrl+Q
```

Each item contains:

-   Action icon
-   Action name
-   Keyboard key badge

### Key badges

Use compact pill-shaped elements.

Example:

``` text
Ctrl+S
```

The key badge should have a slightly lighter background than its
surrounding card.

------------------------------------------------------------------------

# 13. Right Sidebar

The right sidebar contains contextual information.

Recommended width:

``` text
330–370px
```

It contains three cards.

------------------------------------------------------------------------

# 14. Quick Info Card

Title:

``` text
Quick Info
```

Rows:

``` text
</>     Language       C++
≡      Standard       C++17
⚙      Compiler       C:\...\mingw64\bin\g++.exe
```

Each row contains:

1.  Circular icon container
2.  Label
3.  Current value

Use a divider between rows.

Long compiler paths should truncate gracefully.

------------------------------------------------------------------------

# 15. Recent Files Card

Title:

``` text
Recent Files                         Clear
```

Example:

``` text
▱  main.cpp                         2 hours ago
▱  problem.cpp                      3 hours ago
▱  solution.cpp                     5 hours ago
▱  test.cpp                         1 day ago
▱  app.cpp                          2 days ago
```

### Behavior

Clicking a recent file should open it in the editor.

The `Clear` action removes the recent-file history after confirmation if
appropriate.

If there are no recent files:

``` text
No recent files
```

with a helpful empty-state message.

------------------------------------------------------------------------

# 16. Code Faster Card

Small motivational card at the bottom of the sidebar.

Content:

``` text
⚡  Code Faster
    Keep building. Keep learning.
```

Use subtle decorative flowing blue/indigo curves.

This card is intentionally less information-dense than the other sidebar
cards.

------------------------------------------------------------------------

# 17. Status Bar

The bottom status bar should always remain visible.

Suggested structure:

``` text
● Success | Untitled | Language: C++ (C++17) | Compiler: ... | 285ms · 42ms
```

### Left

-   Execution/status indicator
-   Current file

Example:

``` text
● Success
Untitled
```

### Center/right

-   Language
-   Standard
-   Compiler

### Far right

Execution metrics:

``` text
285ms · 42ms
```

These values should be real application data, not hardcoded visual text.

### Status colors

Success: - Green/teal indicator

Warning: - Amber indicator

Error: - Red indicator

Idle: - Muted neutral indicator

------------------------------------------------------------------------

# 18. Cards and Surfaces

All dashboard cards should share a coherent component system.

### Card properties

``` text
Border radius: 10–14px
Border: 1px solid rgba(...)
Background: dark navy surface
Shadow: subtle
```

Do not overuse heavy shadows.

### Nested surfaces

Nested elements can use:

-   Slightly lighter background
-   Thin border
-   Small radius
-   Compact padding

------------------------------------------------------------------------

# 19. Spacing System

Use a consistent 4px/8px spacing system.

Recommended values:

``` text
4px
8px
12px
16px
20px
24px
32px
40px
```

Avoid arbitrary spacing values wherever possible.

### Typical card padding

``` text
20–24px
```

### Typical component gap

``` text
8–16px
```

------------------------------------------------------------------------

# 20. Border Radius

Recommended:

``` text
Buttons:          8–10px
Inputs/selectors: 8px
Cards:            12–16px
Hero:             14–16px
Badges:           6–999px depending on component
Icon containers:  50%
```

Keep radius values consistent throughout the application.

------------------------------------------------------------------------

# 21. Icons

Use one consistent icon family.

Recommended options:

-   Lucide
-   Phosphor
-   Fluent UI icons
-   Native framework icon set

Avoid mixing icon styles.

Important icons:

``` text
Home
Code / Editor
Folder
Settings
Plus
File
Save
Play
Info
Clock
Keyboard
Copy
Chevron Down
Sun
Moon
Menu
```

Icons should generally be 16--20px.

------------------------------------------------------------------------

# 22. Interaction States

Every interactive component should define:

### Default

Normal surface and text.

### Hover

-   Slightly brighter background
-   Accent border where appropriate

### Focus

-   Visible blue focus ring
-   Must work with keyboard navigation

### Pressed

-   Slightly darker/contracted appearance

### Disabled

-   Reduced opacity
-   No misleading hover effect

### Selected

-   Accent-tinted background
-   Stronger text/icon contrast

------------------------------------------------------------------------

# 23. Accessibility

The redesigned dashboard must remain accessible.

Requirements:

-   Do not rely on color alone to communicate status
-   Maintain readable contrast
-   Provide keyboard navigation
-   Provide visible focus states
-   Tooltips for icon-only controls
-   Buttons must have accessible names
-   Interactive targets should be comfortably clickable
-   Avoid extremely small text

------------------------------------------------------------------------

# 24. Responsive Desktop Behavior

The application is a desktop IDE, but the dashboard should gracefully
handle smaller windows.

### Large window

Show:

``` text
Left navigation + main content + right sidebar
```

### Medium window

Reduce:

-   Main content padding
-   Sidebar width
-   Hero spacing

### Narrow desktop window

The right sidebar may collapse into a toggleable panel.

The main dashboard should remain fully usable.

Do not allow important buttons to disappear.

------------------------------------------------------------------------

# 25. Functional Requirements

The redesign is **visual and structural**, not a removal of
functionality.

All existing functionality must continue to work:

-   New File
-   Open File
-   Open Folder
-   Save
-   Save As
-   Run
-   Quit
-   Language selection
-   Standard selection
-   Compiler detection/configuration
-   Recent files
-   Keyboard shortcuts
-   Theme selection
-   Editor navigation
-   Execution status
-   Compiler status

Do not replace working functionality with mock interactions.

------------------------------------------------------------------------

# 26. State Requirements

The dashboard should support:

### Initial state

``` text
Welcome to CarbonCode
No file currently open
```

### File-open state

Show:

-   Current file
-   Language
-   Standard
-   Compiler
-   Recent file history

### Successful execution

Show:

``` text
● Success
```

and execution timing.

### Compilation error

Show:

``` text
● Error
```

with an actionable path to the compiler/output information.

### Missing compiler

Show a clear configuration warning.

### No recent files

Show a compact empty state.

------------------------------------------------------------------------

# 27. Visual Hierarchy

Priority order:

1.  **Run**
2.  **Welcome / current environment**
3.  **New/Open actions**
4.  **Current language and standard**
5.  **Keyboard shortcuts**
6.  **Quick information**
7.  **Recent files**
8.  **Decorative/motivational content**

The interface should immediately communicate:

> "I can start coding here."

------------------------------------------------------------------------

# 28. Design Principles

### 1. Professional over flashy

The interface should look like a real developer tool.

### 2. Information density with breathing room

An IDE contains lots of information, but it should never feel cluttered.

### 3. Blue is an accent, not the entire interface

Use blue for:

-   Primary actions
-   Active navigation
-   Selected states
-   Important highlights

### 4. Consistency over decoration

Repeated components should look identical.

### 5. Function first

Every visual element should support a real workflow.

### 6. Minimal animation

Use subtle transitions:

``` text
120–180ms
ease-out
```

Avoid excessive animation.

------------------------------------------------------------------------

# 29. Suggested Component Architecture

If implemented using HTML/CSS/JS or a component framework, structure the
dashboard approximately as:

``` text
CarbonCodeApp
├── WindowBar
├── CommandBar
│   ├── MenuButton
│   ├── FileActions
│   ├── LanguageSelector
│   ├── StandardSelector
│   └── RunButton
├── AppLayout
│   ├── Sidebar
│   │   ├── Navigation
│   │   └── ThemeSelector
│   ├── Dashboard
│   │   ├── WelcomeHero
│   │   ├── EnvironmentCards
│   │   ├── QuickActions
│   │   └── KeyboardShortcuts
│   └── ContextPanel
│       ├── QuickInfo
│       ├── RecentFiles
│       └── CodeFaster
└── StatusBar
```

Components should be reusable and state-driven.

------------------------------------------------------------------------

# 30. CSS Design Tokens

A centralized token system is recommended.

``` css
:root {
  --bg-app: #080D17;
  --bg-surface: #0F1929;
  --bg-elevated: #111D30;

  --border: #203452;
  --border-subtle: #17263B;

  --text-primary: #F4F7FB;
  --text-secondary: #A9B7CC;
  --text-muted: #6F8099;

  --accent: #1688F5;
  --accent-secondary: #315FEA;
  --accent-highlight: #25B8FF;

  --success: #20D4B0;
  --warning: #F4B740;
  --error: #FF667A;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
}
```

------------------------------------------------------------------------

# 31. Implementation Notes

When implementing the redesign:

-   Preserve the application's current backend and compiler execution
    logic.
-   Preserve existing keyboard shortcuts unless there is a strong
    usability reason to change them.
-   Connect every displayed value to real application state.
-   Do not hardcode compiler paths, Java versions, recent files, or
    execution times.
-   Keep filesystem operations asynchronous where appropriate.
-   Handle missing files, invalid paths, and compiler failures
    gracefully.
-   Ensure the dashboard remains functional when no project is open.
-   Keep the editor itself compatible with the dashboard's design
    language.

------------------------------------------------------------------------

# 32. Final Design Target

The finished CarbonCode dashboard should feel like a compact combination
of:

-   A professional code editor
-   A lightweight development environment manager
-   A clean project launcher

The result should be **dark, modern, technical, calm, and highly
usable**.

The visual reference is the redesigned CarbonCode dashboard: dark navy
surfaces, blue/indigo accents, a persistent navigation rail, a strong
welcome hero, compact development-environment cards, prominent coding
actions, contextual information panels, and a professional status bar.

The redesign should look polished enough to be presented as a real
desktop IDE product while remaining lightweight and practical for
everyday coding.

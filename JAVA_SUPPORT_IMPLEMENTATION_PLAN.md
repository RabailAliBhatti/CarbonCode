# Java Support Implementation Plan

## Goal

Add Java as a first-class language in CarbonCode so students can create, open, edit, compile, run, and eventually debug Java programs alongside the existing C++ workflow.

The target experience is:

- Students can choose C++ or Java per file/tab.
- New Java files start with a working `Main` class template.
- `.java` files open with Java syntax highlighting, snippets, file icons, and save dialogs.
- Run compiles Java with `javac`, then launches it with `java`.
- Interactive stdin/stdout continues to work through the existing output panel.
- Settings clearly distinguish C++ compiler settings from Java JDK settings.
- Lite builds use the system JDK. Full builds either bundle a JDK or clearly document that Java still requires a system JDK.

## Current Codebase Map

These are the main integration points found in the current app:

- `electron/compiler.ts`
  - Currently detects C++ compilers only: bundled MinGW `g++.exe`, system `g++`, `clang++`, or `cl.exe`.
  - Compiles source into a temporary executable and runs it through `startInteractiveProcess`.
  - Has process stdin/stdout/stderr plumbing that Java can reuse.
- `electron/main.ts`
  - File dialogs are C++-only.
  - IPC handlers use `compiler:detect`, `compiler:run`, and `process:start` with `cppStandard`.
  - About dialog says CarbonCode is a C++ IDE.
- `electron/preload.ts` and `src/vite-env.d.ts`
  - Renderer API types are C++-specific.
- `src/App.tsx`
  - Maintains one `compilerInfo` state.
  - Run/debug handlers always assume C++.
  - Passes only `settings.cppStandard` into toolbar/status/run calls.
- `src/hooks/useFileManager.ts`
  - New tab and fallback templates are C++.
  - Opened files are always assigned `language: 'cpp'`.
- `src/hooks/useSettings.ts`
  - Settings only include `cppStandard` and `compilerPath`.
- `src/components/Editor.tsx`
  - Monaco defaults to `cpp`.
  - C++ completions and snippets are hardcoded.
- `src/components/Toolbar.tsx`, `src/components/StatusBar.tsx`, `src/components/SettingsModal.tsx`, `src/components/WelcomeScreen.tsx`
  - UI labels and controls are C++-specific.
- `src/components/FileExplorer.tsx`
  - File icons currently recognize C/C++ extensions.
- `electron/debugger.ts`
  - Debugging is GDB/C++ only.
- Build/package files:
  - `package.json`, `electron-builder.json`, `electron-builder-full.json`, `electron-builder-lite.json`, and `installer.nsh`.
  - Full build currently bundles MinGW, not a JDK.

## Design Decisions To Make First

- Runtime packaging:
  - Recommended initial path: Java support in Lite and development builds uses a system JDK.
  - Full offline Java support requires bundling a JDK/JRE distribution. Pick a licensed distribution, such as Eclipse Temurin or Microsoft Build of OpenJDK, and confirm installer size/licensing before implementation.
- Debugging:
  - Recommended initial scope: compile and run Java only.
  - Java debugging should be a later milestone using JDI or a debug adapter, because current `electron/debugger.ts` is tied to GDB.
- Language selection:
  - Recommended model: infer language from active tab extension, with a language selector for untitled files.
  - Default new file can remain C++ unless product wants the welcome/new-file flow to ask for C++ vs Java.
- Java file/class handling:
  - Java requires the public class name to match the file name.
  - For unsaved Java tabs, compile to `Main.java` and use a template with `public class Main`.
  - For saved Java files, use the actual file name and run the matching public class.

## Proposed Architecture

Introduce a small language abstraction instead of bolting Java onto C++ names everywhere.

Core types:

```ts
type SupportedLanguage = 'cpp' | 'java'

interface LanguageRuntimeSettings {
  cppStandard: CppStandard
  cppCompilerPath: string
  javaHome: string
  javaCompilerPath: string
}

interface RunRequest {
  language: SupportedLanguage
  code: string
  filePath?: string | null
  cppStandard?: CppStandard
}
```

Compiler/runtime split:

- Rename or wrap `electron/compiler.ts` into a language runtime service.
- Keep existing C++ functions internally for compatibility.
- Add Java-specific functions for JDK detection, Java compilation, class-name resolution, and execution.
- IPC should accept `language` and `filePath` so Java can compile with the correct source name.

Recommended module layout:

- `electron/runtimes/types.ts`
- `electron/runtimes/cppRuntime.ts`
- `electron/runtimes/javaRuntime.ts`
- `electron/runtimes/index.ts`

This can also be done in-place in `electron/compiler.ts` for a smaller first patch, but the runtime split will make future languages much easier.

## Phase 1: Language Model And File Handling

- [ ] Add `SupportedLanguage = 'cpp' | 'java'` shared type in the renderer and main process type surface.
- [ ] Add extension-to-language helpers:
  - `.cpp`, `.cc`, `.cxx`, `.c++`, `.h`, `.hpp`, `.hxx` -> `cpp`
  - `.java` -> `java`
- [ ] Update `src/hooks/useFileManager.ts`:
  - Generate Java default template:
    ```java
    public class Main {
        public static void main(String[] args) {
            System.out.println("Hello, World!");
            System.out.println("Welcome to CarbonCode!");
        }
    }
    ```
  - Assign `language` based on extension when opening files.
  - Add `createNewTab(language?: SupportedLanguage, authorName?: string)`.
  - Use `Untitled.cpp` or `Untitled.java` as clearer unsaved display names if UI allows.
- [ ] Update `src/components/TabBar.tsx` type definitions if `language` becomes a stricter union.
- [ ] Update file dialogs in `electron/main.ts`:
  - Open filters include Java files.
  - Save filters include C++ and Java.
  - Default save path should follow active tab language, for example `untitled.java`.
- [ ] Update `src/components/FileExplorer.tsx`:
  - Add Java file icon treatment for `.java`.
  - Keep C/C++ icon behavior unchanged.

Acceptance checks:

- Opening a `.java` file creates a Java tab.
- Opening a `.cpp` file still creates a C++ tab.
- New Java tab contains valid starter code.
- Saving a new Java file defaults to `.java`.

## Phase 2: Monaco Java Editor Support

- [ ] Update `src/components/Editor.tsx` props to accept `language: SupportedLanguage`.
- [ ] Pass `activeTab.language` from `src/App.tsx` into `Editor`.
- [ ] Set Monaco model language when active tab changes:
  - Use `monaco.editor.setModelLanguage(model, language === 'java' ? 'java' : 'cpp')`.
  - Avoid relying only on `defaultLanguage`, because it does not update after initial mount.
- [ ] Add Java language configuration:
  - Comments: `//`, `/* */`
  - Brackets and auto-closing pairs same as C++.
  - Indentation rules for braces.
- [ ] Add Java completions/snippets separate from C++:
  - Keywords: `class`, `public`, `static`, `void`, `int`, `double`, `boolean`, `if`, `else`, `for`, `while`, `return`, `new`, `try`, `catch`, `finally`, `extends`, `implements`, `import`, `package`.
  - Common classes: `String`, `Scanner`, `ArrayList`, `HashMap`, `List`, `Map`, `System`, `Math`.
  - Snippets: `main`, `class`, `println`, `scanner`, `for`, `foreach`, `if`, `trycatch`.
- [ ] Ensure C++ completions are only registered for `cpp`; Java completions only for `java`.
- [ ] Update formatting shortcuts to continue using Monaco actions.

Acceptance checks:

- Java files highlight as Java.
- Java snippets appear in `.java` tabs.
- C++ snippets still appear in C++ tabs.
- Switching between C++ and Java tabs updates highlighting without reloading the app.

## Phase 3: Java JDK Detection

- [ ] Add Java runtime detection in the main process.
- [ ] Detection priority:
  - User-configured `javaCompilerPath` or `javaHome`.
  - Bundled JDK path, if full build later includes one.
  - `JAVA_HOME/bin/javac` and `JAVA_HOME/bin/java`.
  - System `javac` and `java` on `PATH`.
- [ ] Validate both tools:
  - `javac -version`
  - `java -version`
- [ ] Return structured runtime info instead of one string:
  ```ts
  interface RuntimeInfo {
    language: SupportedLanguage
    compilerPath: string | null
    runtimePath?: string | null
    source: 'custom' | 'bundled' | 'system' | 'none'
    version?: string
  }
  ```
- [ ] Keep C++ detection behavior working.
- [ ] Update settings storage in `src/hooks/useSettings.ts`:
  - Rename `compilerPath` to `cppCompilerPath` with migration from existing saved `compilerPath`.
  - Add `javaHome` and/or `javaCompilerPath`.
- [ ] Update `src/components/SettingsModal.tsx`:
  - C++ compiler path field remains.
  - Add Java JDK/Javac path field.
  - Add browse action for Java executable or JDK directory.
  - Explain briefly that Java requires JDK, not just JRE, for compilation.
- [ ] Update `electron/preload.ts` and `src/vite-env.d.ts` with new API methods.

Acceptance checks:

- App detects a system JDK when `javac` is on `PATH`.
- App detects a JDK from `JAVA_HOME`.
- Custom Java compiler path works.
- Existing saved C++ compiler path still migrates and works.

## Phase 4: Java Compile And Run

- [ ] Add a Java compile function:
  - Create a unique temp directory, such as `carboncode-java-${randomUUID()}`.
  - Determine source file name:
    - Saved file: use `basename(filePath)`.
    - Unsaved file: use `Main.java`.
  - Write code to that source file.
  - Run `javac sourceFile`.
  - Capture stderr/stdout and compile time.
- [ ] Add Java class-name resolution:
  - For initial implementation, run the class that matches the source file base name.
  - For unsaved tabs, run `Main`.
  - Optional helper: parse `public class ClassName` to produce better errors when class and file name mismatch.
- [ ] Add Java run function:
  - Run `java -cp tempDir MainClass`.
  - Reuse existing `startInteractiveProcess` idea, but allow command plus args instead of executable-only.
  - Ensure stdin works for `Scanner`, `BufferedReader`, etc.
- [ ] Refactor process management:
  - Current `startInteractiveProcess(executablePath, tempDir, ...)` assumes a C++ executable.
  - Replace with `startInteractiveCommand(command, args, cwd, env, callbacks)`.
  - Keep a C++ wrapper to avoid breaking behavior.
- [ ] Update IPC:
  - Replace or extend `process:start` to accept `{ language, code, filePath, cppStandard }`.
  - Route C++ to existing C++ compile/run.
  - Route Java to Java compile/run.
- [ ] Update `src/App.tsx`:
  - Run active tab with `activeTab.language`.
  - Pass `activeTab.filePath`.
  - Check runtime availability for the active language instead of only `compilerInfo`.
  - Keep output panel behavior unchanged.
- [ ] Update analytics:
  - Either keep existing `code_compiled` / `code_run`, or add language metadata if analytics supports properties later.

Acceptance checks:

- Unsaved Java `Main` template compiles and runs.
- Saved `Hello.java` with `public class Hello` compiles and runs.
- Java program using `Scanner` accepts input through the output panel.
- Compile errors show `javac` diagnostics.
- C++ compile/run behavior is unchanged.

## Phase 5: UI Updates

- [ ] Update `src/components/Toolbar.tsx`:
  - Add active language display or selector.
  - Show C++ standard selector only for C++ tabs.
  - For Java tabs, show Java runtime/JDK status instead of C++ standard.
- [ ] Update `src/components/StatusBar.tsx`:
  - Display `C++ (c++17)` for C++.
  - Display `Java` plus JDK version/source for Java.
- [ ] Update `src/components/WelcomeScreen.tsx`:
  - Mention C++ and Java support.
  - Offer new C++ file and new Java file actions, if welcome screen has room.
  - Show separate C++ compiler and Java JDK status.
- [ ] Update header/logo copy:
  - Avoid labeling the whole app as only `C++` once Java is supported.
  - Consider logo text `</>` or `CC` while keeping CarbonCode branding.
- [ ] Update error messages:
  - C++ missing: ask for C++ compiler.
  - Java missing: ask for JDK with `javac`.
- [ ] Update `README.md`:
  - Describe Java support.
  - Add JDK install instructions.
  - Clarify Full vs Lite behavior for Java.

Acceptance checks:

- UI does not show C++ standard controls for Java files.
- Missing Java JDK message is specific and actionable.
- Existing C++ UI remains familiar.

## Phase 6: Packaging And Installer

- [ ] Decide whether Full build includes a JDK.
- [ ] If bundling a JDK:
  - Add `vendor/jdk` or another agreed vendor path.
  - Update `electron-builder-full.json` `extraResources`.
  - Update default build config if the default installer should include Java.
  - Update runtime detection to check `process.resourcesPath/jdk/bin/javac.exe` and dev vendor path.
  - Add license notices for the chosen JDK distribution.
  - Validate installer size and install time.
- [ ] If not bundling a JDK:
  - Keep Full build C++-offline only.
  - Document Java system JDK requirement clearly in README, Settings, and missing-runtime messages.
- [ ] Update `installer.nsh` only if PATH/JDK installer steps are needed.
- [ ] Test packaged app, not only dev mode.

Acceptance checks:

- Lite build works with system JDK.
- Full build either detects bundled JDK or gives a clear JDK-required message.
- Packaged app can compile and run Java after installation.

## Phase 7: Java Debugging Follow-Up

This is intentionally separate from first Java support.

- [ ] Decide Java debugging technology:
  - Java Debug Interface directly.
  - VS Code Java debug adapter integration.
  - A simplified no-debug Java mode for classrooms.
- [ ] Update debug UI to disable Java debugging until implemented.
- [ ] If implementing Java debug:
  - Compile with debug symbols using `javac -g`.
  - Launch JVM with JDWP.
  - Map breakpoints from Monaco to Java source paths.
  - Surface variables, current line, continue, step over, step into, and step out.

Acceptance checks:

- Java tabs do not start the C++ GDB debugger by mistake.
- UI clearly communicates when Java debugging is unavailable.

## Phase 8: Testing Checklist

- [ ] Unit-level/manual detection tests:
  - No JDK installed or unavailable.
  - `JAVA_HOME` set.
  - `javac` on `PATH`.
  - Custom Java path.
  - Existing C++ bundled compiler detection.
- [ ] Compile/run tests:
  - C++ hello world.
  - Java unsaved `Main`.
  - Java saved class name matching file name.
  - Java saved class name mismatch produces useful diagnostics.
  - Java stdin with `Scanner`.
  - Java runtime error stack trace.
  - C++ stdin remains functional.
- [ ] UI tests/manual checks:
  - New C++ file.
  - New Java file.
  - Open `.cpp` and `.java` files.
  - Save As defaults.
  - Toolbar language/standard state.
  - Status bar runtime state.
  - Settings migration from old `compilerPath`.
- [ ] Build checks:
  - `npm run build`
  - `npm run build:lite`
  - `npm run build:full`, if JDK packaging is configured.

## Suggested Implementation Order For Agents

1. Add language typing, templates, extension detection, and file dialog support.
2. Add Monaco Java editor support and active-tab language switching.
3. Add Java JDK detection and settings fields.
4. Refactor process runner to accept command/args, then implement Java compile/run.
5. Update toolbar, status bar, welcome screen, settings copy, and README.
6. Decide and implement packaging behavior.
7. Add Java debugging only after compile/run is stable.

## Risks And Notes

- Java public class name mismatches are the biggest student-facing footgun. Handle this with a clear compile error or preflight warning.
- `java` and `javac` can be installed separately in some environments; require both.
- JRE-only installations cannot compile Java. Detection must look for `javac`.
- Bundling a JDK will substantially increase installer size.
- The current process runner uses `shell: true` and quoted strings. When refactoring, prefer command plus args arrays to reduce quoting issues with paths containing spaces.
- Debugging should not be partially wired for Java until a real Java debugger path is chosen.

/**
 * Java IntelliSense Engine for CarbonCode
 * Provides comprehensive Standard Library completions, package hierarchy navigation,
 * and automatic cross-file project symbol indexing.
 */

export interface JavaParam {
    type: string
    name: string
}

export interface JavaMethodSymbol {
    name: string
    isStatic: boolean
    returnType: string
    params: JavaParam[]
    signature: string
    documentation?: string
}

export interface JavaFieldSymbol {
    name: string
    isStatic: boolean
    isFinal: boolean
    type: string
    signature: string
}

export interface JavaConstructorSymbol {
    params: JavaParam[]
    signature: string
}

export interface JavaClassSymbol {
    name: string
    kind: 'class' | 'interface' | 'enum' | 'record'
    fileName: string
    filePath?: string | null
    packageName?: string
    documentation?: string
    constructors: JavaConstructorSymbol[]
    methods: JavaMethodSymbol[]
    fields: JavaFieldSymbol[]
}

export interface ProjectJavaFile {
    fileName: string
    content: string
    filePath?: string | null
}

// In-memory project symbol cache
const projectSymbols: Map<string, JavaClassSymbol[]> = new Map()

/**
 * Parses a Java source file content and extracts class/interface/enum definitions,
 * constructors, methods, and fields.
 */
export function parseJavaFileSymbols(content: string, fileName: string, filePath?: string | null): JavaClassSymbol[] {
    const symbols: JavaClassSymbol[] = []

    // 1. Extract package if present
    const packageMatch = content.match(/^\s*package\s+([a-zA-Z0-9_.]+)\s*;/m)
    const packageName = packageMatch ? packageMatch[1] : undefined

    // 2. Remove string literals and comments for cleaner regex parsing of declarations
    const cleanContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
        .replace(/\/\/.*/g, '') // remove line comments
        .replace(/"(?:\\.|[^"\\])*"/g, '""') // remove string literals

    // 3. Find type declarations: class, interface, enum, record
    const typeRegex = /(?:public|protected|private|abstract|final|static|\s)*\b(class|interface|enum|record)\s+([A-Za-z0-9_]+)(?:<[^>]+>)?(?:\s*\([^)]*\))?(?:\s+extends\s+[A-Za-z0-9_<>]+)?(?:\s+implements\s+[A-Za-z0-9_<>,\s]+)?\s*\{/g
    let match: RegExpExecArray | null

    while ((match = typeRegex.exec(cleanContent)) !== null) {
        const kind = match[1] as 'class' | 'interface' | 'enum' | 'record'
        const className = match[2]

        // Find the matching closing brace for this class body
        const startIndex = match.index + match[0].length
        let braceDepth = 1
        let endIndex = startIndex

        for (let i = startIndex; i < cleanContent.length; i++) {
            if (cleanContent[i] === '{') braceDepth++
            else if (cleanContent[i] === '}') {
                braceDepth--
                if (braceDepth === 0) {
                    endIndex = i
                    break
                }
            }
        }

        const classBody = cleanContent.substring(startIndex, endIndex)

        // Parse constructors
        const constructors: JavaConstructorSymbol[] = []

        // If it's a record with canonical components, add canonical constructor
        if (kind === 'record') {
            const recordParamsMatch = match[0].match(/\(([^)]*)\)/)
            if (recordParamsMatch) {
                const rawParams = recordParamsMatch[1].trim()
                constructors.push({
                    params: parseParams(rawParams),
                    signature: `${className}(${rawParams})`
                })
            }
        }

        const ctorRegex = new RegExp(`(?:^|[;}])\\s*(?:(public|protected|private)\\s+)?\\b${className}\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[A-Za-z0-9_<>\\s,]+)?\\s*\\{`, 'g')
        let ctorMatch: RegExpExecArray | null
        while ((ctorMatch = ctorRegex.exec(classBody)) !== null) {
            const rawParams = ctorMatch[2].trim()
            const params = parseParams(rawParams)
            constructors.push({
                params,
                signature: `${className}(${rawParams})`
            })
        }

        // If no explicit constructor found and it's a class, add default constructor
        if (constructors.length === 0 && kind === 'class') {
            constructors.push({
                params: [],
                signature: `${className}()`
            })
        }

        // Parse methods
        const methods: JavaMethodSymbol[] = []
        const methodRegex = /(?:(public|protected|private)\s+)?(?:(static)\s+)?(?:(final|synchronized|abstract)\s+)*([A-Za-z0-9_<>\[\]]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+[A-Za-z0-9_,\s]+)?(?:\s*\{|\s*;)/g
        let mMatch: RegExpExecArray | null

        while ((mMatch = methodRegex.exec(classBody)) !== null) {
            const visibility = mMatch[1] || 'package'
            const isStatic = !!mMatch[2]
            const returnType = mMatch[4]
            const methodName = mMatch[5]
            const rawParams = mMatch[6].trim()

            // Skip if it's the constructor or language keywords
            if (methodName === className || ['if', 'while', 'for', 'switch', 'catch'].includes(methodName)) {
                continue
            }

            const params = parseParams(rawParams)
            methods.push({
                name: methodName,
                isStatic,
                returnType,
                params,
                signature: `${methodName}(${rawParams}) -> ${returnType}`,
                documentation: `${visibility} ${isStatic ? 'static ' : ''}${returnType} ${methodName}(${rawParams})`
            })
        }

        // Parse fields & constants
        const fields: JavaFieldSymbol[] = []
        const fieldRegex = /(?:(public|protected|private)\s+)?(?:(static)\s+)?(?:(final)\s+)?([A-Za-z0-9_<>\[\]]+)\s+([A-Za-z0-9_]+)\s*(?:=|;)/g
        let fMatch: RegExpExecArray | null

        while ((fMatch = fieldRegex.exec(classBody)) !== null) {
            const isStatic = !!fMatch[2]
            const isFinal = !!fMatch[3]
            const fieldType = fMatch[4]
            const fieldName = fMatch[5]

            // Avoid catching method keywords or controls
            if (['return', 'throw', 'new', 'class', 'package', 'import'].includes(fieldType)) continue

            fields.push({
                name: fieldName,
                isStatic,
                isFinal,
                type: fieldType,
                signature: `${fieldName}: ${fieldType}`
            })
        }

        symbols.push({
            name: className,
            kind,
            fileName,
            filePath,
            packageName,
            documentation: `${packageName ? `package ${packageName};\n\n` : ''}${kind} ${className} (${fileName})`,
            constructors,
            methods,
            fields
        })
    }

    return symbols
}

function parseParams(rawParams: string): JavaParam[] {
    if (!rawParams) return []
    return rawParams.split(',').map(p => {
        const parts = p.trim().split(/\s+/)
        if (parts.length >= 2) {
            return { type: parts[parts.length - 2], name: parts[parts.length - 1] }
        }
        return { type: 'Object', name: parts[0] || 'arg' }
    })
}

/**
 * Updates the symbol registry with all active project Java files.
 */
export function updateJavaProjectFiles(files: ProjectJavaFile[]): void {
    projectSymbols.clear()
    for (const file of files) {
        if (!file.content) continue
        const symbols = parseJavaFileSymbols(file.content, file.fileName, file.filePath)
        projectSymbols.set(file.fileName, symbols)
    }
}

/**
 * Returns all currently indexed project symbols across all files.
 */
export function getAllProjectSymbols(): JavaClassSymbol[] {
    const all: JavaClassSymbol[] = []
    for (const syms of projectSymbols.values()) {
        all.push(...syms)
    }
    return all
}

// -------------------------------------------------------------
// Java Standard Library Package Catalog
// -------------------------------------------------------------

export interface PackageDirectory {
    subpackages: string[]
    classes: string[]
}

export const JAVA_STANDARD_PACKAGES: Record<string, PackageDirectory> = {
    '': {
        subpackages: ['java', 'javax', 'org', 'com'],
        classes: []
    },
    'java': {
        subpackages: ['util', 'io', 'lang', 'net', 'nio', 'time', 'math', 'text', 'security', 'sql', 'awt'],
        classes: []
    },
    'java.util': {
        subpackages: ['concurrent', 'function', 'regex', 'stream', 'zip', 'jar', 'logging', 'spi'],
        classes: [
            // Collections & Data Structures
            'ArrayList', 'LinkedList', 'Vector', 'Stack', 'PriorityQueue', 'ArrayDeque',
            'Queue', 'Deque', 'List', 'Set', 'HashSet', 'LinkedHashSet', 'TreeSet',
            'SortedSet', 'NavigableSet', 'BitSet', 'EnumSet',
            'Map', 'HashMap', 'LinkedHashMap', 'TreeMap', 'IdentityHashMap', 'WeakHashMap',
            'SortedMap', 'NavigableMap', 'EnumMap', 'Dictionary', 'Hashtable', 'Properties',
            // Utilities
            'Scanner', 'Arrays', 'Collections', 'Objects', 'Optional', 'OptionalInt',
            'OptionalLong', 'OptionalDouble', 'Random', 'UUID', 'StringTokenizer', 'StringJoiner',
            'Base64', 'Formatter', 'Formattable', 'Locale', 'ResourceBundle', 'Currency',
            'Date', 'Calendar', 'GregorianCalendar', 'TimeZone', 'SimpleTimeZone', 'Timer', 'TimerTask',
            'Comparator', 'Iterator', 'ListIterator', 'Spliterator',
            'IntSummaryStatistics', 'LongSummaryStatistics', 'DoubleSummaryStatistics',
            'EventObject', 'EventListener'
        ]
    },
    'java.util.concurrent': {
        subpackages: ['atomic', 'locks'],
        classes: [
            'CompletableFuture', 'ExecutorService', 'Executors', 'Future', 'Callable',
            'CountDownLatch', 'CyclicBarrier', 'Semaphore', 'Phaser', 'Exchanger',
            'ConcurrentHashMap', 'ConcurrentLinkedQueue', 'ConcurrentLinkedDeque',
            'ConcurrentSkipListMap', 'ConcurrentSkipListSet', 'CopyOnWriteArrayList', 'CopyOnWriteArraySet',
            'BlockingQueue', 'ArrayBlockingQueue', 'LinkedBlockingQueue', 'PriorityBlockingQueue',
            'DelayQueue', 'SynchronousQueue', 'LinkedTransferQueue', 'TransferQueue',
            'TimeUnit', 'ThreadLocalRandom', 'ForkJoinPool', 'ForkJoinTask', 'RecursiveTask', 'RecursiveAction',
            'CompletionStage', 'ScheduledExecutorService', 'ScheduledFuture', 'ScheduledThreadPoolExecutor',
            'ThreadPoolExecutor', 'RejectedExecutionHandler', 'CancellationException', 'ExecutionException', 'TimeoutException'
        ]
    },
    'java.util.concurrent.atomic': {
        subpackages: [],
        classes: [
            'AtomicInteger', 'AtomicLong', 'AtomicBoolean', 'AtomicReference',
            'AtomicIntegerArray', 'AtomicLongArray', 'AtomicReferenceArray',
            'LongAdder', 'DoubleAdder', 'LongAccumulator', 'DoubleAccumulator'
        ]
    },
    'java.util.concurrent.locks': {
        subpackages: [],
        classes: [
            'Lock', 'ReentrantLock', 'ReadWriteLock', 'ReentrantReadWriteLock',
            'Condition', 'StampedLock', 'LockSupport'
        ]
    },
    'java.util.function': {
        subpackages: [],
        classes: [
            'Consumer', 'BiConsumer', 'Supplier', 'Function', 'BiFunction',
            'Predicate', 'BiPredicate', 'UnaryOperator', 'BinaryOperator',
            'IntConsumer', 'IntFunction', 'IntPredicate', 'IntSupplier', 'IntUnaryOperator',
            'LongConsumer', 'LongFunction', 'LongPredicate', 'LongSupplier', 'LongUnaryOperator',
            'DoubleConsumer', 'DoubleFunction', 'DoublePredicate', 'DoubleSupplier', 'DoubleUnaryOperator',
            'ToDoubleFunction', 'ToIntFunction', 'ToLongFunction', 'ToDoubleBiFunction', 'ToIntBiFunction', 'ToLongBiFunction'
        ]
    },
    'java.util.stream': {
        subpackages: [],
        classes: ['Stream', 'Collectors', 'IntStream', 'LongStream', 'DoubleStream', 'BaseStream']
    },
    'java.util.regex': {
        subpackages: [],
        classes: ['Pattern', 'Matcher', 'MatchResult', 'PatternSyntaxException']
    },
    'java.io': {
        subpackages: [],
        classes: [
            'File', 'FileReader', 'FileWriter', 'BufferedReader', 'BufferedWriter',
            'PrintWriter', 'PrintStream', 'InputStream', 'OutputStream',
            'FileInputStream', 'FileOutputStream', 'ByteArrayInputStream', 'ByteArrayOutputStream',
            'DataInputStream', 'DataOutputStream', 'ObjectInputStream', 'ObjectOutputStream',
            'InputStreamReader', 'OutputStreamWriter', 'StringReader', 'StringWriter',
            'CharArrayReader', 'CharArrayWriter', 'PipedInputStream', 'PipedOutputStream',
            'PipedReader', 'PipedWriter', 'BufferedInputStream', 'BufferedOutputStream',
            'FilterInputStream', 'FilterOutputStream', 'LineNumberReader', 'PushbackInputStream',
            'PushbackReader', 'RandomAccessFile', 'FileDescriptor', 'FilePermission',
            'FilenameFilter', 'FileFilter', 'IOException', 'FileNotFoundException',
            'EOFException', 'InterruptedIOException', 'SyncFailedException', 'UnsupportedEncodingException',
            'Closeable', 'Flushable', 'AutoCloseable', 'Serializable', 'Externalizable'
        ]
    },
    'java.nio.file': {
        subpackages: ['attribute', 'spi'],
        classes: [
            'Path', 'Paths', 'Files', 'FileSystem', 'FileSystems',
            'StandardOpenOption', 'StandardCopyOption', 'FileAlreadyExistsException',
            'NoSuchFileException', 'DirectoryNotEmptyException', 'SimpleFileVisitor',
            'FileVisitor', 'FileVisitResult', 'WatchService', 'WatchKey', 'WatchEvent',
            'StandardWatchEventKinds', 'OpenOption', 'CopyOption', 'LinkOption'
        ]
    },
    'java.time': {
        subpackages: ['chrono', 'format', 'temporal', 'zone'],
        classes: [
            'LocalDate', 'LocalTime', 'LocalDateTime', 'ZonedDateTime', 'OffsetDateTime',
            'OffsetTime', 'Instant', 'Duration', 'Period', 'ZoneId', 'ZoneOffset',
            'Clock', 'Month', 'DayOfWeek', 'Year', 'YearMonth', 'MonthDay', 'DateTimeException'
        ]
    },
    'java.time.format': {
        subpackages: [],
        classes: ['DateTimeFormatter', 'DateTimeFormatterBuilder', 'FormatStyle', 'ResolverStyle', 'TextStyle']
    },
    'java.time.temporal': {
        subpackages: [],
        classes: ['ChronoUnit', 'ChronoField', 'Temporal', 'TemporalAccessor', 'TemporalAdjuster', 'TemporalAdjusters', 'TemporalAmount', 'TemporalQuery', 'TemporalUnit']
    },
    'java.net': {
        subpackages: ['http', 'spi'],
        classes: [
            'URI', 'URL', 'HttpURLConnection', 'URLConnection', 'Socket', 'ServerSocket',
            'DatagramSocket', 'DatagramPacket', 'InetAddress', 'Inet4Address', 'Inet6Address',
            'InetSocketAddress', 'SocketAddress', 'URLEncoder', 'URLDecoder',
            'CookieHandler', 'CookieManager', 'HttpCookie', 'Proxy', 'ProxySelector',
            'StandardSocketOptions', 'NetworkInterface', 'SocketException', 'UnknownHostException',
            'MalformedURLException', 'ProtocolException'
        ]
    },
    'java.net.http': {
        subpackages: [],
        classes: ['HttpClient', 'HttpRequest', 'HttpResponse', 'HttpHeaders', 'WebSocket']
    },
    'java.math': {
        subpackages: [],
        classes: ['BigInteger', 'BigDecimal', 'MathContext', 'RoundingMode']
    },
    'java.sql': {
        subpackages: [],
        classes: [
            'Connection', 'DriverManager', 'Statement', 'PreparedStatement', 'CallableStatement',
            'ResultSet', 'ResultSetMetaData', 'DatabaseMetaData', 'SQLException', 'SQLWarning',
            'Types', 'Date', 'Time', 'Timestamp', 'Blob', 'Clob', 'Array', 'Struct', 'Savepoint'
        ]
    },
    'java.lang': {
        subpackages: ['annotation', 'reflect', 'invoke'],
        classes: [
            'String', 'StringBuilder', 'StringBuffer', 'System', 'Math', 'Integer', 'Double',
            'Float', 'Long', 'Short', 'Byte', 'Boolean', 'Character', 'Number', 'Object', 'Class',
            'Thread', 'Runnable', 'ThreadLocal', 'ThreadGroup', 'Throwable', 'Exception',
            'RuntimeException', 'Error', 'IllegalArgumentException', 'IllegalStateException',
            'NullPointerException', 'IndexOutOfBoundsException', 'ArrayIndexOutOfBoundsException',
            'UnsupportedOperationException', 'NumberFormatException', 'Comparable', 'Iterable',
            'CharSequence', 'Cloneable', 'AutoCloseable', 'Record', 'Enum', 'StackTraceElement'
        ]
    },
    'javax.swing': {
        subpackages: ['border', 'event', 'table', 'tree'],
        classes: [
            'JFrame', 'JPanel', 'JButton', 'JLabel', 'JTextField', 'JTextArea',
            'JPasswordField', 'JCheckBox', 'JRadioButton', 'ButtonGroup', 'JComboBox',
            'JList', 'JScrollPane', 'JTable', 'JTree', 'JMenuBar', 'JMenu', 'JMenuItem',
            'JPopupMenu', 'JDialog', 'JOptionPane', 'JFileChooser', 'JColorChooser',
            'JTabbedPane', 'JSplitPane', 'JToolBar', 'JProgressBar', 'JSlider', 'JSpinner',
            'SwingUtilities', 'BorderFactory', 'ImageIcon'
        ]
    },
    'java.awt': {
        subpackages: ['color', 'event', 'geom', 'image'],
        classes: [
            'Color', 'Font', 'Graphics', 'Graphics2D', 'Dimension', 'Point', 'Rectangle',
            'Insets', 'BorderLayout', 'FlowLayout', 'GridLayout', 'GridBagLayout', 'CardLayout',
            'BoxLayout', 'Container', 'Component', 'Toolkit', 'Image', 'Cursor', 'EventQueue',
            'BasicStroke', 'Paint', 'Stroke'
        ]
    }
}

export const JAVA_ALL_CLASS_IMPORTS: Record<string, string> = {}
for (const [pkg, data] of Object.entries(JAVA_STANDARD_PACKAGES)) {
    if (!pkg || pkg === 'java.lang') continue
    for (const cls of data.classes) {
        if (!JAVA_ALL_CLASS_IMPORTS[cls]) {
            JAVA_ALL_CLASS_IMPORTS[cls] = `${pkg}.${cls}`
        }
    }
}

// -------------------------------------------------------------
// Java Member Suggestions (Dot-Completions)
// -------------------------------------------------------------

export const JAVA_STATIC_MEMBERS: Record<string, Array<{ name: string; snippet?: string; kind?: string; detail: string; doc: string }>> = {
    'System': [
        { name: 'out', detail: 'PrintStream System.out', doc: 'Standard output stream' },
        { name: 'err', detail: 'PrintStream System.err', doc: 'Standard error output stream' },
        { name: 'in', detail: 'InputStream System.in', doc: 'Standard input stream' },
        { name: 'currentTimeMillis', snippet: 'currentTimeMillis()', detail: 'long currentTimeMillis()', doc: 'Returns current time in milliseconds' },
        { name: 'nanoTime', snippet: 'nanoTime()', detail: 'long nanoTime()', doc: 'Returns current time in nanoseconds' },
        { name: 'exit', snippet: 'exit(${1:0});', detail: 'void exit(int status)', doc: 'Terminates the currently running JVM' },
        { name: 'arraycopy', snippet: 'arraycopy(${1:src}, ${2:srcPos}, ${3:dest}, ${4:destPos}, ${5:length});', detail: 'void arraycopy(...)', doc: 'Copies an array from specified source to destination' },
        { name: 'getenv', snippet: 'getenv("${1:name}")', detail: 'String getenv(String name)', doc: 'Gets environment variable' },
        { name: 'getProperty', snippet: 'getProperty("${1:key}")', detail: 'String getProperty(String key)', doc: 'Gets system property' },
        { name: 'gc', snippet: 'gc();', detail: 'void gc()', doc: 'Runs garbage collector' }
    ],
    'System.out': [
        { name: 'println', snippet: 'println($1);', detail: 'void println(Object x)', doc: 'Prints and terminates line' },
        { name: 'print', snippet: 'print($1);', detail: 'void print(Object x)', doc: 'Prints without newline' },
        { name: 'printf', snippet: 'printf("${1:%s}\\n", ${2:args});', detail: 'PrintStream printf(String format, Object... args)', doc: 'Formatted print' },
        { name: 'flush', snippet: 'flush();', detail: 'void flush()', doc: 'Flushes the stream' },
        { name: 'close', snippet: 'close();', detail: 'void close()', doc: 'Closes the stream' }
    ],
    'System.err': [
        { name: 'println', snippet: 'println($1);', detail: 'void println(Object x)', doc: 'Prints error message with newline' },
        { name: 'print', snippet: 'print($1);', detail: 'void print(Object x)', doc: 'Prints error message' },
        { name: 'printf', snippet: 'printf("${1:%s}\\n", ${2:args});', detail: 'PrintStream printf(...)', doc: 'Formatted error print' }
    ],
    'Math': [
        { name: 'abs', snippet: 'abs($1)', detail: 'abs(a)', doc: 'Returns absolute value' },
        { name: 'max', snippet: 'max(${1:a}, ${2:b})', detail: 'max(a, b)', doc: 'Returns greater of two values' },
        { name: 'min', snippet: 'min(${1:a}, ${2:b})', detail: 'min(a, b)', doc: 'Returns smaller of two values' },
        { name: 'sqrt', snippet: 'sqrt($1)', detail: 'double sqrt(double a)', doc: 'Returns positive square root' },
        { name: 'pow', snippet: 'pow(${1:base}, ${2:exponent})', detail: 'double pow(double a, double b)', doc: 'Returns base raised to the power exponent' },
        { name: 'random', snippet: 'random()', detail: 'double random()', doc: 'Returns pseudo-random double between 0.0 and 1.0' },
        { name: 'round', snippet: 'round($1)', detail: 'round(a)', doc: 'Returns closest long/int' },
        { name: 'floor', snippet: 'floor($1)', detail: 'double floor(double a)', doc: 'Rounds down' },
        { name: 'ceil', snippet: 'ceil($1)', detail: 'double ceil(double a)', doc: 'Rounds up' },
        { name: 'sin', snippet: 'sin($1)', detail: 'double sin(double a)', doc: 'Trigonometric sine' },
        { name: 'cos', snippet: 'cos($1)', detail: 'double cos(double a)', doc: 'Trigonometric cosine' },
        { name: 'tan', snippet: 'tan($1)', detail: 'double tan(double a)', doc: 'Trigonometric tangent' },
        { name: 'log', snippet: 'log($1)', detail: 'double log(double a)', doc: 'Natural logarithm (base e)' },
        { name: 'log10', snippet: 'log10($1)', detail: 'double log10(double a)', doc: 'Base 10 logarithm' },
        { name: 'PI', detail: 'double PI = 3.14159...', doc: 'Value of pi' },
        { name: 'E', detail: 'double E = 2.71828...', doc: 'Base of natural logarithms' }
    ],
    'Arrays': [
        { name: 'sort', snippet: 'sort(${1:array});', detail: 'void sort(...)', doc: 'Sorts the specified array into ascending order' },
        { name: 'binarySearch', snippet: 'binarySearch(${1:array}, ${2:key})', detail: 'int binarySearch(...)', doc: 'Searches array for specified value using binary search' },
        { name: 'copyOf', snippet: 'copyOf(${1:original}, ${2:newLength})', detail: 'T[] copyOf(...)', doc: 'Copies specified array, truncating or padding with zeros' },
        { name: 'copyOfRange', snippet: 'copyOfRange(${1:original}, ${2:from}, ${3:to})', detail: 'T[] copyOfRange(...)', doc: 'Copies specified range of array' },
        { name: 'equals', snippet: 'equals(${1:a}, ${2:b})', detail: 'boolean equals(...)', doc: 'Returns true if two arrays are equal' },
        { name: 'deepEquals', snippet: 'deepEquals(${1:a}, ${2:b})', detail: 'boolean deepEquals(...)', doc: 'Returns true if two nested arrays are deeply equal' },
        { name: 'fill', snippet: 'fill(${1:array}, ${2:val});', detail: 'void fill(...)', doc: 'Assigns specified value to each element of array' },
        { name: 'toString', snippet: 'toString(${1:array})', detail: 'String toString(...)', doc: 'Returns string representation of array contents' },
        { name: 'deepToString', snippet: 'deepToString(${1:array})', detail: 'String deepToString(...)', doc: 'Returns string representation of deep/nested array' },
        { name: 'asList', snippet: 'asList(${1:elements})', detail: 'List<T> asList(T... a)', doc: 'Returns fixed-size list backed by specified array' },
        { name: 'stream', snippet: 'stream(${1:array})', detail: 'Stream<T> stream(T[] array)', doc: 'Returns sequential stream with specified array as source' }
    ],
    'Collections': [
        { name: 'sort', snippet: 'sort(${1:list});', detail: 'void sort(List<T> list)', doc: 'Sorts list into ascending order' },
        { name: 'reverse', snippet: 'reverse(${1:list});', detail: 'void reverse(List<?> list)', doc: 'Reverses order of elements in list' },
        { name: 'shuffle', snippet: 'shuffle(${1:list});', detail: 'void shuffle(List<?> list)', doc: 'Randomly permutes list elements' },
        { name: 'unmodifiableList', snippet: 'unmodifiableList(${1:list})', detail: 'List<T> unmodifiableList(...)', doc: 'Returns unmodifiable view of specified list' },
        { name: 'unmodifiableMap', snippet: 'unmodifiableMap(${1:map})', detail: 'Map<K, V> unmodifiableMap(...)', doc: 'Returns unmodifiable view of specified map' },
        { name: 'singletonList', snippet: 'singletonList(${1:o})', detail: 'List<T> singletonList(T o)', doc: 'Returns immutable list containing only specified item' },
        { name: 'emptyList', snippet: 'emptyList()', detail: 'List<T> emptyList()', doc: 'Returns empty immutable list' },
        { name: 'emptyMap', snippet: 'emptyMap()', detail: 'Map<K, V> emptyMap()', doc: 'Returns empty immutable map' },
        { name: 'emptySet', snippet: 'emptySet()', detail: 'Set<T> emptySet()', doc: 'Returns empty immutable set' },
        { name: 'min', snippet: 'min(${1:coll})', detail: 'T min(Collection<? extends T> coll)', doc: 'Returns minimum element according to natural ordering' },
        { name: 'max', snippet: 'max(${1:coll})', detail: 'T max(Collection<? extends T> coll)', doc: 'Returns maximum element according to natural ordering' },
        { name: 'frequency', snippet: 'frequency(${1:c}, ${2:o})', detail: 'int frequency(Collection<?> c, Object o)', doc: 'Returns count of occurrences of object in collection' }
    ],
    'Objects': [
        { name: 'requireNonNull', snippet: 'requireNonNull(${1:obj}, "${2:must not be null}")', detail: 'T requireNonNull(T obj)', doc: 'Checks that specified object reference is not null' },
        { name: 'equals', snippet: 'equals(${1:a}, ${2:b})', detail: 'boolean equals(Object a, Object b)', doc: 'Returns true if arguments are equal to each other' },
        { name: 'hashCode', snippet: 'hashCode(${1:o})', detail: 'int hashCode(Object o)', doc: 'Returns hash code of non-null argument and 0 for null' },
        { name: 'hash', snippet: 'hash(${1:values})', detail: 'int hash(Object... values)', doc: 'Generates hash code for sequence of input values' },
        { name: 'toString', snippet: 'toString(${1:o})', detail: 'String toString(Object o)', doc: 'Returns result of calling toString on non-null argument' },
        { name: 'isNull', snippet: 'isNull(${1:obj})', detail: 'boolean isNull(Object obj)', doc: 'Returns true if provided reference is null' },
        { name: 'nonNull', snippet: 'nonNull(${1:obj})', detail: 'boolean nonNull(Object obj)', doc: 'Returns true if provided reference is non-null' }
    ],
    'String': [
        { name: 'valueOf', snippet: 'valueOf($1)', detail: 'String valueOf(...)', doc: 'Returns string representation of the argument' },
        { name: 'format', snippet: 'format("${1:%s}", ${2:args})', detail: 'String format(String format, Object... args)', doc: 'Returns formatted string' },
        { name: 'join', snippet: 'join("${1:, }", ${2:elements})', detail: 'String join(CharSequence delimiter, ...)', doc: 'Returns new String composed of copies of elements joined with delimiter' }
    ],
    'Integer': [
        { name: 'parseInt', snippet: 'parseInt("${1:123}")', detail: 'int parseInt(String s)', doc: 'Parses string argument as signed decimal integer' },
        { name: 'valueOf', snippet: 'valueOf($1)', detail: 'Integer valueOf(...)', doc: 'Returns Integer instance representing specified value' },
        { name: 'toString', snippet: 'toString($1)', detail: 'String toString(int i)', doc: 'Returns string object representing specified integer' },
        { name: 'compare', snippet: 'compare(${1:x}, ${2:y})', detail: 'int compare(int x, int y)', doc: 'Compares two int values numerically' },
        { name: 'MAX_VALUE', detail: 'int MAX_VALUE = 2147483647', doc: 'Maximum value of int' },
        { name: 'MIN_VALUE', detail: 'int MIN_VALUE = -2147483648', doc: 'Minimum value of int' }
    ],
    'Double': [
        { name: 'parseDouble', snippet: 'parseDouble("${1:3.14}")', detail: 'double parseDouble(String s)', doc: 'Parses string argument as double' },
        { name: 'valueOf', snippet: 'valueOf($1)', detail: 'Double valueOf(...)', doc: 'Returns Double instance' },
        { name: 'isNaN', snippet: 'isNaN($1)', detail: 'boolean isNaN(double v)', doc: 'Returns true if specified number is NaN' },
        { name: 'isInfinite', snippet: 'isInfinite($1)', detail: 'boolean isInfinite(double v)', doc: 'Returns true if specified number is infinitely large' },
        { name: 'MAX_VALUE', detail: 'double MAX_VALUE', doc: 'Largest positive finite value of type double' },
        { name: 'MIN_VALUE', detail: 'double MIN_VALUE', doc: 'Smallest positive nonzero value of type double' }
    ]
}

// Common instance methods for standard types
export const JAVA_INSTANCE_MEMBERS: Array<{ name: string; snippet: string; detail: string; doc: string }> = [
    // Object methods
    { name: 'toString', snippet: 'toString()', detail: 'String toString()', doc: 'Returns string representation of the object' },
    { name: 'equals', snippet: 'equals(${1:obj})', detail: 'boolean equals(Object obj)', doc: 'Indicates whether some other object is equal to this one' },
    { name: 'hashCode', snippet: 'hashCode()', detail: 'int hashCode()', doc: 'Returns hash code value for the object' },
    { name: 'getClass', snippet: 'getClass()', detail: 'Class<?> getClass()', doc: 'Returns runtime class of this Object' },
    // String methods
    { name: 'length', snippet: 'length()', detail: 'int length()', doc: 'Returns length of this string' },
    { name: 'charAt', snippet: 'charAt(${1:index})', detail: 'char charAt(int index)', doc: 'Returns char value at specified index' },
    { name: 'substring', snippet: 'substring(${1:beginIndex}, ${2:endIndex})', detail: 'String substring(...)', doc: 'Returns substring of this string' },
    { name: 'toLowerCase', snippet: 'toLowerCase()', detail: 'String toLowerCase()', doc: 'Converts all characters in this String to lower case' },
    { name: 'toUpperCase', snippet: 'toUpperCase()', detail: 'String toUpperCase()', doc: 'Converts all characters in this String to upper case' },
    { name: 'trim', snippet: 'trim()', detail: 'String trim()', doc: 'Returns string with leading and trailing whitespace omitted' },
    { name: 'contains', snippet: 'contains("${1:seq}")', detail: 'boolean contains(CharSequence s)', doc: 'Returns true if string contains specified sequence' },
    { name: 'replace', snippet: 'replace("${1:target}", "${2:replacement}")', detail: 'String replace(...)', doc: 'Replaces occurrences of target sequence' },
    { name: 'split', snippet: 'split("${1:\\\\s+}")', detail: 'String[] split(String regex)', doc: 'Splits this string around matches of given regular expression' },
    { name: 'startsWith', snippet: 'startsWith("${1:prefix}")', detail: 'boolean startsWith(String prefix)', doc: 'Tests if this string starts with specified prefix' },
    { name: 'endsWith', snippet: 'endsWith("${1:suffix}")', detail: 'boolean endsWith(String suffix)', doc: 'Tests if this string ends with specified suffix' },
    { name: 'isEmpty', snippet: 'isEmpty()', detail: 'boolean isEmpty()', doc: 'Returns true if, and only if, length() is 0' },
    // Collection / List methods
    { name: 'size', snippet: 'size()', detail: 'int size()', doc: 'Returns number of elements in this collection' },
    { name: 'add', snippet: 'add(${1:element});', detail: 'boolean add(E e)', doc: 'Appends specified element to this collection' },
    { name: 'get', snippet: 'get(${1:index})', detail: 'E get(int index)', doc: 'Returns element at specified position in list' },
    { name: 'set', snippet: 'set(${1:index}, ${2:element});', detail: 'E set(int index, E element)', doc: 'Replaces element at specified position' },
    { name: 'remove', snippet: 'remove(${1:index});', detail: 'E remove(...)', doc: 'Removes element from collection/map' },
    { name: 'clear', snippet: 'clear();', detail: 'void clear()', doc: 'Removes all elements from this collection' },
    { name: 'stream', snippet: 'stream()', detail: 'Stream<E> stream()', doc: 'Returns sequential Stream with this collection as its source' },
    { name: 'forEach', snippet: 'forEach(${1:item} -> $0);', detail: 'void forEach(Consumer<? super T> action)', doc: 'Performs given action for each element' },
    // Map methods
    { name: 'put', snippet: 'put(${1:key}, ${2:value});', detail: 'V put(K key, V value)', doc: 'Associates specified value with specified key in map' },
    { name: 'containsKey', snippet: 'containsKey(${1:key})', detail: 'boolean containsKey(Object key)', doc: 'Returns true if map contains mapping for specified key' },
    { name: 'containsValue', snippet: 'containsValue(${1:value})', detail: 'boolean containsValue(Object value)', doc: 'Returns true if map maps one or more keys to value' },
    { name: 'keySet', snippet: 'keySet()', detail: 'Set<K> keySet()', doc: 'Returns Set view of keys contained in map' },
    { name: 'values', snippet: 'values()', detail: 'Collection<V> values()', doc: 'Returns Collection view of values contained in map' },
    { name: 'entrySet', snippet: 'entrySet()', detail: 'Set<Map.Entry<K,V>> entrySet()', doc: 'Returns Set view of mappings contained in map' },
    // Scanner methods
    { name: 'nextInt', snippet: 'nextInt()', detail: 'int nextInt()', doc: 'Scans the next token of the input as an int' },
    { name: 'nextDouble', snippet: 'nextDouble()', detail: 'double nextDouble()', doc: 'Scans the next token as a double' },
    { name: 'nextLine', snippet: 'nextLine()', detail: 'String nextLine()', doc: 'Advances scanner past current line and returns skipped input' },
    { name: 'next', snippet: 'next()', detail: 'String next()', doc: 'Finds and returns next complete token from this scanner' },
    { name: 'hasNext', snippet: 'hasNext()', detail: 'boolean hasNext()', doc: 'Returns true if this scanner has another token in its input' },
    { name: 'hasNextLine', snippet: 'hasNextLine()', detail: 'boolean hasNextLine()', doc: 'Returns true if there is another line in scanner input' },
    { name: 'close', snippet: 'close();', detail: 'void close()', doc: 'Closes this stream or resource' }
]

// -------------------------------------------------------------
// Provider Function for Monaco Editor
// -------------------------------------------------------------

/**
 * Main completion provider function for Java in Monaco editor.
 */
export function getJavaCompletionItems(model: any, position: any, monaco: any): { suggestions: any[] } {
    const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
    })

    const lineContent = model.getLineContent(position.lineNumber)
    const word = model.getWordUntilPosition(position)
    const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
    }

    const suggestions: any[] = []

    // ---------------------------------------------------------
    // 1. IMPORT STATEMENT COMPLETION (e.g. import java.util.|)
    // ---------------------------------------------------------
    const importMatch = textUntilPosition.match(/^\s*import\s+(static\s+)?([a-zA-Z0-9_.]*)$/)
    if (importMatch) {
        const fullPrefix = importMatch[2] || ''
        const lastDotIndex = fullPrefix.lastIndexOf('.')

        let parentPackage = ''
        let queryPart = fullPrefix

        if (lastDotIndex !== -1) {
            parentPackage = fullPrefix.substring(0, lastDotIndex)
            queryPart = fullPrefix.substring(lastDotIndex + 1)
        }

        // 1A. Standard Library Packages & Classes
        const pkgData = JAVA_STANDARD_PACKAGES[parentPackage]
        if (pkgData) {
            // Suggest subpackages
            for (const sub of pkgData.subpackages) {
                if (!queryPart || sub.toLowerCase().startsWith(queryPart.toLowerCase())) {
                    suggestions.push({
                        label: sub,
                        kind: monaco.languages.CompletionItemKind.Module,
                        detail: `package ${parentPackage ? parentPackage + '.' : ''}${sub}`,
                        insertText: sub,
                        range,
                        sortText: '0_' + sub
                    })
                }
            }

            // Suggest classes in this package
            for (const cls of pkgData.classes) {
                if (!queryPart || cls.toLowerCase().startsWith(queryPart.toLowerCase())) {
                    const hasSemicolon = lineContent.trim().endsWith(';')
                    suggestions.push({
                        label: cls,
                        kind: monaco.languages.CompletionItemKind.Class,
                        detail: `${parentPackage}.${cls}`,
                        insertText: cls + (hasSemicolon ? '' : ';'),
                        range,
                        sortText: '1_' + cls
                    })
                }
            }

            // Wildcard import
            if (!queryPart || queryPart === '*') {
                const hasSemicolon = lineContent.trim().endsWith(';')
                suggestions.push({
                    label: '*',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    detail: `import all from ${parentPackage}`,
                    insertText: '*' + (hasSemicolon ? '' : ';'),
                    range,
                    sortText: '2_*'
                })
            }
        }

        // 1B. Project Packages & Classes for multi-file projects
        const projectSyms = getAllProjectSymbols()
        const projectPackages = new Set<string>()

        for (const sym of projectSyms) {
            if (sym.packageName) {
                projectPackages.add(sym.packageName)
                if (sym.packageName === parentPackage) {
                    if (!queryPart || sym.name.toLowerCase().startsWith(queryPart.toLowerCase())) {
                        const hasSemicolon = lineContent.trim().endsWith(';')
                        suggestions.push({
                            label: sym.name,
                            kind: sym.kind === 'interface'
                                ? monaco.languages.CompletionItemKind.Interface
                                : sym.kind === 'enum'
                                    ? monaco.languages.CompletionItemKind.Enum
                                    : monaco.languages.CompletionItemKind.Class,
                            detail: `Project ${sym.kind} • ${sym.fileName}`,
                            insertText: sym.name + (hasSemicolon ? '' : ';'),
                            range,
                            sortText: '0_proj_' + sym.name
                        })
                    }
                }
            }
        }

        // Suggest project package names if typing root or subpackages
        for (const pkg of projectPackages) {
            if (!parentPackage && pkg.toLowerCase().startsWith(queryPart.toLowerCase())) {
                suggestions.push({
                    label: pkg,
                    kind: monaco.languages.CompletionItemKind.Module,
                    detail: `Project package (${pkg})`,
                    insertText: pkg,
                    range,
                    sortText: '0_proj_pkg_' + pkg
                })
            }
        }

        return { suggestions }
    }

    // ---------------------------------------------------------
    // 2. DOT MEMBER ACCESS (e.g. System.out.|, Math.|, MyClass.|)
    // ---------------------------------------------------------
    const dotMatch = textUntilPosition.match(/([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)\.([A-Za-z0-9_]*)$/)
    if (dotMatch) {
        const callerExpression = dotMatch[1]
        const memberQuery = dotMatch[2]

        // 2A. Known Standard Static Members (System.out, Math, Arrays, Collections, etc.)
        const staticList = JAVA_STATIC_MEMBERS[callerExpression]
        if (staticList) {
            for (const item of staticList) {
                if (!memberQuery || item.name.toLowerCase().startsWith(memberQuery.toLowerCase())) {
                    suggestions.push({
                        label: item.name,
                        kind: item.snippet
                            ? monaco.languages.CompletionItemKind.Method
                            : monaco.languages.CompletionItemKind.Property,
                        detail: item.detail,
                        documentation: item.doc,
                        insertText: item.snippet || item.name,
                        insertTextRules: item.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
                        range,
                        sortText: '0_' + item.name
                    })
                }
            }
            return { suggestions }
        }

        // 2B. Multi-File Project Class Member Access (e.g. Student.createGuest(), Calculator.add())
        const projectSyms = getAllProjectSymbols()
        const matchingClass = projectSyms.find(s => s.name === callerExpression)

        if (matchingClass) {
            // Suggest static methods
            for (const m of matchingClass.methods.filter(m => m.isStatic)) {
                if (!memberQuery || m.name.toLowerCase().startsWith(memberQuery.toLowerCase())) {
                    const paramsPlaceholder = m.params.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ')
                    suggestions.push({
                        label: m.name,
                        kind: monaco.languages.CompletionItemKind.Method,
                        detail: `${matchingClass.name}.${m.signature} • ${matchingClass.fileName}`,
                        documentation: m.documentation,
                        insertText: `${m.name}(${paramsPlaceholder})`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        sortText: '0_proj_' + m.name
                    })
                }
            }

            // Suggest static fields / constants
            for (const f of matchingClass.fields.filter(f => f.isStatic)) {
                if (!memberQuery || f.name.toLowerCase().startsWith(memberQuery.toLowerCase())) {
                    suggestions.push({
                        label: f.name,
                        kind: monaco.languages.CompletionItemKind.Field,
                        detail: `${matchingClass.name}.${f.signature} • ${matchingClass.fileName}`,
                        insertText: f.name,
                        range,
                        sortText: '0_proj_f_' + f.name
                    })
                }
            }

            return { suggestions }
        }

        // 2C. Instance Member Completion (for variables)
        // Check if callerExpression matches a project class instance methods
        for (const sym of projectSyms) {
            for (const m of sym.methods.filter(m => !m.isStatic)) {
                if (!memberQuery || m.name.toLowerCase().startsWith(memberQuery.toLowerCase())) {
                    const paramsPlaceholder = m.params.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ')
                    suggestions.push({
                        label: m.name,
                        kind: monaco.languages.CompletionItemKind.Method,
                        detail: `${sym.name}.${m.signature} • ${sym.fileName}`,
                        documentation: m.documentation,
                        insertText: `${m.name}(${paramsPlaceholder})`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        sortText: '2_proj_inst_' + m.name
                    })
                }
            }
        }

        // Standard instance methods (Strings, Collections, Scanner, Object)
        for (const item of JAVA_INSTANCE_MEMBERS) {
            if (!memberQuery || item.name.toLowerCase().startsWith(memberQuery.toLowerCase())) {
                suggestions.push({
                    label: item.name,
                    kind: monaco.languages.CompletionItemKind.Method,
                    detail: item.detail,
                    documentation: item.doc,
                    insertText: item.snippet,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range,
                    sortText: '3_std_' + item.name
                })
            }
        }

        return { suggestions }
    }

    // ---------------------------------------------------------
    // 3. INSTANTIATION COMPLETIONS (e.g. new Student(|))
    // ---------------------------------------------------------
    const newMatch = textUntilPosition.match(/\bnew\s+([A-Za-z0-9_]*)$/)
    if (newMatch) {
        const query = newMatch[1]
        const projectSyms = getAllProjectSymbols()

        // 3A. Suggest Project Classes with constructor parameter snippets
        for (const sym of projectSyms) {
            if (sym.kind !== 'class') continue
            if (!query || sym.name.toLowerCase().startsWith(query.toLowerCase())) {
                for (const ctor of sym.constructors) {
                    const paramsPlaceholder = ctor.params.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ')
                    suggestions.push({
                        label: `${sym.name}(${ctor.params.map(p => p.type + ' ' + p.name).join(', ')})`,
                        kind: monaco.languages.CompletionItemKind.Constructor,
                        detail: `Project Constructor • ${sym.fileName}`,
                        documentation: `new ${ctor.signature}`,
                        insertText: `${sym.name}(${paramsPlaceholder})`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        sortText: '0_proj_new_' + sym.name
                    })
                }
            }
        }

        // 3B. Suggest Standard Library Classes with common constructor snippets
        const standardInstantiables: Array<{ label: string; snippet: string; detail: string }> = [
            { label: 'Scanner(System.in)', snippet: 'Scanner(System.in)', detail: 'Scanner from java.util' },
            { label: 'ArrayList<>()', snippet: 'ArrayList<${1:Type}>()', detail: 'ArrayList from java.util' },
            { label: 'HashMap<>()', snippet: 'HashMap<${1:Key}, ${2:Value}>()', detail: 'HashMap from java.util' },
            { label: 'HashSet<>()', snippet: 'HashSet<${1:Type}>()', detail: 'HashSet from java.util' },
            { label: 'StringBuilder()', snippet: 'StringBuilder()', detail: 'StringBuilder from java.lang' },
            { label: 'Random()', snippet: 'Random()', detail: 'Random from java.util' },
            { label: 'File("...")', snippet: 'File("${1:pathname}")', detail: 'File from java.io' },
            { label: 'BufferedReader(...)', snippet: 'BufferedReader(new InputStreamReader(System.in))', detail: 'BufferedReader from java.io' }
        ]

        for (const item of standardInstantiables) {
            if (!query || item.label.toLowerCase().startsWith(query.toLowerCase())) {
                suggestions.push({
                    label: item.label,
                    kind: monaco.languages.CompletionItemKind.Constructor,
                    detail: item.detail,
                    insertText: item.snippet,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range,
                    sortText: '1_std_new_' + item.label
                })
            }
        }

        return { suggestions }
    }

    // ---------------------------------------------------------
    // 4. GENERAL CODE AUTOCOMPLETIONS (Classes, Keywords, Snippets)
    // ---------------------------------------------------------

    // 4A. Project Classes & Symbols from other files
    const projectSyms = getAllProjectSymbols()
    for (const sym of projectSyms) {
        suggestions.push({
            label: sym.name,
            kind: sym.kind === 'interface'
                ? monaco.languages.CompletionItemKind.Interface
                : sym.kind === 'enum'
                    ? monaco.languages.CompletionItemKind.Enum
                    : monaco.languages.CompletionItemKind.Class,
            detail: `Project ${sym.kind} • ${sym.fileName}`,
            documentation: sym.documentation,
            insertText: sym.name,
            range,
            sortText: '0_proj_cls_' + sym.name
        })
    }

    // 4B. Standard Java Keywords
    const keywords = [
        'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
        'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
        'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
        'package', 'private', 'protected', 'public', 'record', 'return', 'short', 'static', 'strictfp',
        'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void',
        'volatile', 'while', 'var', 'yield'
    ]

    for (const kw of keywords) {
        suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
            sortText: '3_kw_' + kw
        })
    }

    // 4C. Standard Classes in java.lang & java.util & java.io
    const popularClasses = [
        'String', 'System', 'Math', 'Scanner', 'ArrayList', 'HashMap', 'HashSet', 'LinkedList',
        'TreeMap', 'TreeSet', 'List', 'Map', 'Set', 'Queue', 'Deque', 'Collections', 'Arrays',
        'Objects', 'Optional', 'StringBuilder', 'StringBuffer', 'Integer', 'Double', 'Boolean',
        'Character', 'Long', 'Float', 'File', 'Files', 'Path', 'Paths', 'FileReader', 'FileWriter',
        'BufferedReader', 'BufferedWriter', 'PrintWriter', 'PrintStream', 'InputStream',
        'OutputStream', 'IOException', 'Exception', 'RuntimeException', 'Thread', 'Runnable',
        'LocalDate', 'LocalTime', 'LocalDateTime', 'Instant', 'Duration', 'Period',
        'BigInteger', 'BigDecimal', 'UUID', 'Random', 'Pattern', 'Matcher', 'CompletableFuture'
    ]

    for (const cls of popularClasses) {
        suggestions.push({
            label: cls,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: `Standard Java Class`,
            insertText: cls,
            range,
            sortText: '2_std_cls_' + cls
        })
    }

    // 4D. Productive Snippets
    const snippets = [
        {
            label: 'psvm',
            insertText: ['public static void main(String[] args) {', '\t$0', '}'].join('\n'),
            doc: 'public static void main(String[] args)'
        },
        {
            label: 'sout',
            insertText: 'System.out.println($1);',
            doc: 'System.out.println()'
        },
        {
            label: 'soutv',
            insertText: 'System.out.println("${1:variable} = " + $1);',
            doc: 'System.out.println("var = " + var)'
        },
        {
            label: 'serr',
            insertText: 'System.err.println($1);',
            doc: 'System.err.println()'
        },
        {
            label: 'for',
            insertText: ['for (int ${1:i} = 0; $1 < ${2:count}; $1++) {', '\t$0', '}'].join('\n'),
            doc: 'for loop'
        },
        {
            label: 'foreach',
            insertText: ['for (${1:Type} ${2:item} : ${3:collection}) {', '\t$0', '}'].join('\n'),
            doc: 'enhanced for-each loop'
        },
        {
            label: 'while',
            insertText: ['while (${1:condition}) {', '\t$0', '}'].join('\n'),
            doc: 'while loop'
        },
        {
            label: 'ifelse',
            insertText: ['if (${1:condition}) {', '\t$2', '} else {', '\t$0', '}'].join('\n'),
            doc: 'if-else statement'
        },
        {
            label: 'try-catch',
            insertText: ['try {', '\t$1', '} catch (${2:Exception} ${3:e}) {', '\t${3:e}.printStackTrace();', '}'].join('\n'),
            doc: 'try-catch block'
        },
        {
            label: 'try-resources',
            insertText: ['try (${1:Scanner scanner = new Scanner(System.in)}) {', '\t$0', '}'].join('\n'),
            doc: 'try-with-resources statement'
        },
        {
            label: 'scanner-input',
            insertText: [
                'Scanner ${1:scanner} = new Scanner(System.in);',
                'System.out.print("${2:Enter input: }");',
                '${3:String input = $1.nextLine();}',
                '$0'
            ].join('\n'),
            doc: 'Interactive console input via Scanner'
        }
    ]

    for (const snip of snippets) {
        suggestions.push({
            label: snip.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snip.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: snip.doc,
            range,
            sortText: '4_snip_' + snip.label
        })
    }

    return { suggestions }
}

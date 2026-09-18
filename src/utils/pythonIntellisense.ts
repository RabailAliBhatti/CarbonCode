/**
 * Python IntelliSense Engine for CarbonCode
 * Provides comprehensive built-ins, stdlib modules and members,
 * local variable / symbol extraction, and snippets for Monaco editor.
 */

export interface PythonParam {
    name: string
    defaultValue?: string
}

export interface PythonFunctionSymbol {
    name: string
    params: string[]
    line: number
    column: number
    docstring?: string
}

export interface PythonClassSymbol {
    name: string
    baseClasses: string[]
    methods: PythonFunctionSymbol[]
    line: number
    column: number
    docstring?: string
}

export interface PythonVariableSymbol {
    name: string
    kind: 'local' | 'param' | 'loop' | 'with' | 'except'
    line: number
    column: number
    detail?: string
}

export interface PythonSnippet {
    label: string
    insertText: string
    detail: string
    documentation: string
}

export interface PythonCompletion {
    label: string
    kind: 'Function' | 'Class' | 'Module' | 'Keyword' | 'Variable' | 'Snippet' | 'Constant'
    detail: string
    documentation: string
    insertText?: string
}

// ---------------------------------------------------------------------------
// 1. Python Built-ins (Functions, Types, Constants, Exceptions)
// ---------------------------------------------------------------------------

export const PYTHON_BUILTINS: PythonCompletion[] = [
    // Core Functions
    { label: 'print', kind: 'Function', detail: 'print(*values, sep=" ", end="\\n", file=None, flush=False)', documentation: 'Prints values to a stream, or to sys.stdout by default.' },
    { label: 'input', kind: 'Function', detail: 'input(prompt="") -> str', documentation: 'Read a string from standard input. The trailing newline is stripped.' },
    { label: 'len', kind: 'Function', detail: 'len(s) -> int', documentation: 'Return the number of items in a container or sequence.' },
    { label: 'range', kind: 'Function', detail: 'range(stop) or range(start, stop[, step])', documentation: 'Return an object that produces a sequence of integers from start to stop by step.' },
    { label: 'enumerate', kind: 'Function', detail: 'enumerate(iterable, start=0)', documentation: 'Return an enumerate object yielding pairs of (index, item).' },
    { label: 'zip', kind: 'Function', detail: 'zip(*iterables, strict=False)', documentation: 'Iterate over several iterables in parallel, producing tuples with an item from each.' },
    { label: 'map', kind: 'Function', detail: 'map(function, *iterables)', documentation: 'Make an iterator that computes the function using arguments from each of the iterables.' },
    { label: 'filter', kind: 'Function', detail: 'filter(function, iterable)', documentation: 'Construct an iterator from those elements of iterable for which function returns true.' },
    { label: 'sorted', kind: 'Function', detail: 'sorted(iterable, *, key=None, reverse=False)', documentation: 'Return a new list containing all items from the iterable in ascending order.' },
    { label: 'reversed', kind: 'Function', detail: 'reversed(sequence) -> iterator', documentation: 'Return a reverse iterator over the values of the sequence.' },
    { label: 'sum', kind: 'Function', detail: 'sum(iterable, /, start=0)', documentation: 'Return the sum of a \'start\' value plus an iterable of numbers.' },
    { label: 'min', kind: 'Function', detail: 'min(iterable, *[, default=obj, key=func]) -> value', documentation: 'Return the smallest item in an iterable or the smallest of two or more arguments.' },
    { label: 'max', kind: 'Function', detail: 'max(iterable, *[, default=obj, key=func]) -> value', documentation: 'Return the largest item in an iterable or the largest of two or more arguments.' },
    { label: 'abs', kind: 'Function', detail: 'abs(x) -> number', documentation: 'Return the absolute value of the argument.' },
    { label: 'round', kind: 'Function', detail: 'round(number, ndigits=None) -> number', documentation: 'Round a number to a given precision in decimal digits.' },
    { label: 'pow', kind: 'Function', detail: 'pow(base, exp[, mod]) -> number', documentation: 'Equivalent to base**exp with 2 arguments or (base**exp) % mod with 3 arguments.' },
    { label: 'divmod', kind: 'Function', detail: 'divmod(x, y) -> (div, mod)', documentation: 'Return the tuple (x // y, x % y).' },
    { label: 'all', kind: 'Function', detail: 'all(iterable) -> bool', documentation: 'Return True if bool(x) is True for all values x in the iterable.' },
    { label: 'any', kind: 'Function', detail: 'any(iterable) -> bool', documentation: 'Return True if bool(x) is True for any x in the iterable.' },
    { label: 'open', kind: 'Function', detail: 'open(file, mode="r", buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)', documentation: 'Open file and return a corresponding file stream object.' },
    { label: 'isinstance', kind: 'Function', detail: 'isinstance(object, classinfo) -> bool', documentation: 'Return whether an object is an instance of a class or of a subclass thereof.' },
    { label: 'issubclass', kind: 'Function', detail: 'issubclass(class, classinfo) -> bool', documentation: 'Return whether \'class\' is a derived from another class or is the same class.' },
    { label: 'iter', kind: 'Function', detail: 'iter(iterable) -> iterator or iter(callable, sentinel)', documentation: 'Get an iterator from an object.' },
    { label: 'next', kind: 'Function', detail: 'next(iterator[, default]) -> item', documentation: 'Return the next item from the iterator. If default is given, return it on StopIteration.' },
    { label: 'id', kind: 'Function', detail: 'id(object) -> int', documentation: 'Return the identity of an object (integer guaranteed to be unique and constant).' },
    { label: 'hash', kind: 'Function', detail: 'hash(object) -> int', documentation: 'Return the hash value of the given object.' },
    { label: 'type', kind: 'Function', detail: 'type(object) -> type of object', documentation: 'Return the object\'s type, or construct a new type.' },
    { label: 'help', kind: 'Function', detail: 'help([object])', documentation: 'Invoke the built-in help system.' },
    { label: 'dir', kind: 'Function', detail: 'dir([object]) -> list of strings', documentation: 'If called without an argument, return the names in the current scope. If given an argument, return its valid attributes.' },
    { label: 'vars', kind: 'Function', detail: 'vars([object]) -> dictionary', documentation: 'Return the __dict__ attribute for a module, class, instance, or any other object with a __dict__.' },
    { label: 'globals', kind: 'Function', detail: 'globals() -> dictionary', documentation: 'Return the dictionary containing the current scope\'s global variables.' },
    { label: 'locals', kind: 'Function', detail: 'locals() -> dictionary', documentation: 'Update and return a dictionary containing the current scope\'s local variables.' },
    { label: 'callable', kind: 'Function', detail: 'callable(obj) -> bool', documentation: 'Return True if the object appears callable (functions, classes, instances with __call__).' },
    { label: 'getattr', kind: 'Function', detail: 'getattr(object, name[, default]) -> value', documentation: 'Get a named attribute from an object.' },
    { label: 'setattr', kind: 'Function', detail: 'setattr(object, name, value)', documentation: 'Sets the named attribute on the given object with the specified value.' },
    { label: 'delattr', kind: 'Function', detail: 'delattr(object, name)', documentation: 'Deletes the named attribute from the given object.' },
    { label: 'hasattr', kind: 'Function', detail: 'hasattr(object, name) -> bool', documentation: 'Return whether the object has an attribute with the given name.' },
    { label: 'repr', kind: 'Function', detail: 'repr(obj) -> str', documentation: 'Return the canonical string representation of the object.' },
    { label: 'ascii', kind: 'Function', detail: 'ascii(obj) -> str', documentation: 'Return an ASCII-only representation of an object, escaping non-ASCII characters.' },
    { label: 'bin', kind: 'Function', detail: 'bin(number) -> str', documentation: 'Return the binary representation of an integer with prefix 0b.' },
    { label: 'oct', kind: 'Function', detail: 'oct(number) -> str', documentation: 'Return the octal representation of an integer with prefix 0o.' },
    { label: 'hex', kind: 'Function', detail: 'hex(number) -> str', documentation: 'Return the hexadecimal representation of an integer with prefix 0x.' },
    { label: 'chr', kind: 'Function', detail: 'chr(i) -> str', documentation: 'Return a Unicode string of one character whose ASCII or Unicode code point is integer i.' },
    { label: 'ord', kind: 'Function', detail: 'ord(c) -> int', documentation: 'Return the integer representing the character\'s Unicode code point.' },
    { label: 'format', kind: 'Function', detail: 'format(value[, format_spec]) -> str', documentation: 'Format a value according to the given format specification.' },
    { label: 'eval', kind: 'Function', detail: 'eval(source, globals=None, locals=None) -> value', documentation: 'Evaluate the given source in the context of globals and locals.' },
    { label: 'exec', kind: 'Function', detail: 'exec(source, globals=None, locals=None)', documentation: 'Execute the given Python code dynamically.' },
    { label: 'super', kind: 'Function', detail: 'super([type[, object-or-type]]) -> proxy object', documentation: 'Return a proxy object that delegates method calls to a parent or sibling class.' },
    { label: 'property', kind: 'Function', detail: '@property or property(fget=None, fset=None, fdel=None, doc=None)', documentation: 'Property attribute for getter, setter, and deleter methods.' },
    { label: 'classmethod', kind: 'Function', detail: '@classmethod', documentation: 'Convert a method into a class method receiving the class as first argument.' },
    { label: 'staticmethod', kind: 'Function', detail: '@staticmethod', documentation: 'Convert a method into a static method receiving no implicit first argument.' },

    // Built-in Types
    { label: 'int', kind: 'Class', detail: 'int(x=0) or int(x, base=10) -> integer', documentation: 'Convert a number or string to an integer, or return 0 if no arguments are given.' },
    { label: 'float', kind: 'Class', detail: 'float(x=0.0) -> floating point number', documentation: 'Convert a string or number to a floating point number.' },
    { label: 'str', kind: 'Class', detail: 'str(object="") -> string', documentation: 'Create a new string object from the given object.' },
    { label: 'bool', kind: 'Class', detail: 'bool(x=False) -> bool', documentation: 'Returns True when the argument x is true, False otherwise.' },
    { label: 'list', kind: 'Class', detail: 'list(iterable=()) -> new list', documentation: 'Built-in mutable sequence collection.' },
    { label: 'tuple', kind: 'Class', detail: 'tuple(iterable=()) -> new tuple', documentation: 'Built-in immutable sequence collection.' },
    { label: 'dict', kind: 'Class', detail: 'dict(**kwargs) or dict(mapping, **kwargs)', documentation: 'Built-in key-value mapping collection.' },
    { label: 'set', kind: 'Class', detail: 'set(iterable=()) -> new set', documentation: 'Built-in mutable unordered collection of unique elements.' },
    { label: 'frozenset', kind: 'Class', detail: 'frozenset(iterable=()) -> new frozenset', documentation: 'Built-in immutable unordered collection of unique elements.' },
    { label: 'bytes', kind: 'Class', detail: 'bytes(iterable_of_ints) -> bytes object', documentation: 'Construct an immutable array of bytes.' },
    { label: 'bytearray', kind: 'Class', detail: 'bytearray(iterable_of_ints) -> bytearray object', documentation: 'Construct a mutable array of bytes.' },
    { label: 'complex', kind: 'Class', detail: 'complex(real=0, imag=0) -> complex number', documentation: 'Create a complex number from a real part and an optional imaginary part.' },
    { label: 'slice', kind: 'Class', detail: 'slice(stop) or slice(start, stop[, step])', documentation: 'Create a slice object representing the set of indices specified by range.' },
    { label: 'object', kind: 'Class', detail: 'object()', documentation: 'The base class of the class hierarchy.' },

    // Constants
    { label: 'True', kind: 'Constant', detail: 'True (bool)', documentation: 'Boolean true value.' },
    { label: 'False', kind: 'Constant', detail: 'False (bool)', documentation: 'Boolean false value.' },
    { label: 'None', kind: 'Constant', detail: 'None (NoneType)', documentation: 'The sole value of the NoneType, representing the absence of a value.' },
    { label: 'Ellipsis', kind: 'Constant', detail: 'Ellipsis (...)', documentation: 'Special value used mostly in conjunction with extended slicing syntax.' },
    { label: '__name__', kind: 'Constant', detail: '__name__: str', documentation: 'The name of the current module, or "__main__" if running directly.' },
    { label: '__file__', kind: 'Constant', detail: '__file__: str', documentation: 'Pathname of the file from which the module was loaded.' },
    { label: '__doc__', kind: 'Constant', detail: '__doc__: str', documentation: 'The documentation string of the object, module, or class.' },

    // Built-in Exceptions
    { label: 'Exception', kind: 'Class', detail: 'class Exception(BaseException)', documentation: 'Common base class for all non-exit exceptions.' },
    { label: 'ValueError', kind: 'Class', detail: 'class ValueError(Exception)', documentation: 'Raised when an operation or function receives an argument that has the right type but an inappropriate value.' },
    { label: 'TypeError', kind: 'Class', detail: 'class TypeError(Exception)', documentation: 'Raised when an operation or function is applied to an object of inappropriate type.' },
    { label: 'KeyError', kind: 'Class', detail: 'class KeyError(LookupError)', documentation: 'Raised when a mapping (dictionary) key is not found in the set of existing keys.' },
    { label: 'IndexError', kind: 'Class', detail: 'class IndexError(LookupError)', documentation: 'Raised when a sequence subscript is out of range.' },
    { label: 'AttributeError', kind: 'Class', detail: 'class AttributeError(Exception)', documentation: 'Raised when an attribute reference or assignment fails.' },
    { label: 'FileNotFoundError', kind: 'Class', detail: 'class FileNotFoundError(OSError)', documentation: 'Raised when a file or directory is requested but doesn\'t exist.' },
    { label: 'ZeroDivisionError', kind: 'Class', detail: 'class ZeroDivisionError(ArithmeticError)', documentation: 'Raised when the second argument for a division or modulo operation is zero.' },
    { label: 'ImportError', kind: 'Class', detail: 'class ImportError(Exception)', documentation: 'Raised when the import statement has troubles trying to load a module.' },
    { label: 'ModuleNotFoundError', kind: 'Class', detail: 'class ModuleNotFoundError(ImportError)', documentation: 'Raised by import when a module could not be located.' },
    { label: 'StopIteration', kind: 'Class', detail: 'class StopIteration(Exception)', documentation: 'Raised by built-in next() and an iterator\'s __next__() method to signal end of loop.' },
    { label: 'RuntimeError', kind: 'Class', detail: 'class RuntimeError(Exception)', documentation: 'Raised when an error is detected that doesn\'t fall in any of the other categories.' },
    { label: 'SyntaxError', kind: 'Class', detail: 'class SyntaxError(Exception)', documentation: 'Raised when the parser encounters a syntax error.' },
    { label: 'IndentationError', kind: 'Class', detail: 'class IndentationError(SyntaxError)', documentation: 'Base class for syntax errors related to incorrect indentation.' },
    { label: 'NameError', kind: 'Class', detail: 'class NameError(Exception)', documentation: 'Raised when a local or global name is not found.' },
    { label: 'KeyboardInterrupt', kind: 'Class', detail: 'class KeyboardInterrupt(BaseException)', documentation: 'Raised when the user hits the interrupt key (normally Control-C).' }
]

// ---------------------------------------------------------------------------
// 2. Python Standard Library Modules
// ---------------------------------------------------------------------------

export const PYTHON_MODULES: PythonCompletion[] = [
    { label: 'os', kind: 'Module', detail: 'module os', documentation: 'Miscellaneous operating system interfaces, file/directory management, and environment variables.' },
    { label: 'sys', kind: 'Module', detail: 'module sys', documentation: 'System-specific parameters, exit(), stdin/stdout, and interpreter internals.' },
    { label: 'math', kind: 'Module', detail: 'module math', documentation: 'Mathematical functions (trigonometric, logarithmic, constants pi, e, tau).' },
    { label: 'json', kind: 'Module', detail: 'module json', documentation: 'JSON (JavaScript Object Notation) encoder and decoder.' },
    { label: 'random', kind: 'Module', detail: 'module random', documentation: 'Generate pseudo-random numbers, choice(), shuffle(), randint(), sample().' },
    { label: 're', kind: 'Module', detail: 'module re', documentation: 'Regular expression operations and pattern matching.' },
    { label: 'datetime', kind: 'Module', detail: 'module datetime', documentation: 'Basic date and time types (datetime, date, time, timedelta, timezone).' },
    { label: 'time', kind: 'Module', detail: 'module time', documentation: 'Time access, sleep(), perf_counter(), and epoch timestamp conversions.' },
    { label: 'pathlib', kind: 'Module', detail: 'module pathlib', documentation: 'Object-oriented filesystem paths with Path class.' },
    { label: 'collections', kind: 'Module', detail: 'module collections', documentation: 'High-performance container datatypes (Counter, defaultdict, deque, namedtuple).' },
    { label: 'itertools', kind: 'Module', detail: 'module itertools', documentation: 'Functions creating iterators for efficient looping (chain, cycle, islice, product, combinations).' },
    { label: 'functools', kind: 'Module', detail: 'module functools', documentation: 'Higher-order functions and operations on callable objects (lru_cache, partial, reduce).' },
    { label: 'typing', kind: 'Module', detail: 'module typing', documentation: 'Support for type hints (List, Dict, Tuple, Optional, Union, Any, Callable).' },
    { label: 'io', kind: 'Module', detail: 'module io', documentation: 'Core tools for working with streams (StringIO, BytesIO).' },
    { label: 'threading', kind: 'Module', detail: 'module threading', documentation: 'Thread-based parallelism (Thread, Lock, RLock, Event, Semaphore).' },
    { label: 'subprocess', kind: 'Module', detail: 'module subprocess', documentation: 'Subprocess management, run(), Popen, PIPE.' },
    { label: 'socket', kind: 'Module', detail: 'module socket', documentation: 'Low-level networking interface for TCP/UDP sockets.' },
    { label: 'hashlib', kind: 'Module', detail: 'module hashlib', documentation: 'Secure hashes and message digests (sha256, md5, sha1, sha512).' },
    { label: 'csv', kind: 'Module', detail: 'module csv', documentation: 'CSV (Comma Separated Values) file reading and writing.' },
    { label: 'sqlite3', kind: 'Module', detail: 'module sqlite3', documentation: 'Embedded SQLite database engine.' },
    { label: 'logging', kind: 'Module', detail: 'module logging', documentation: 'Logging facility with configurable levels (debug, info, warning, error, critical).' },
    { label: 'unittest', kind: 'Module', detail: 'module unittest', documentation: 'Unit testing framework with TestCase.' },
    { label: 'dataclasses', kind: 'Module', detail: 'module dataclasses', documentation: 'Generate boilerplate methods for classes using @dataclass.' },
    { label: 'enum', kind: 'Module', detail: 'module enum', documentation: 'Support for enumerations (Enum, IntEnum, auto).' },
    { label: 'copy', kind: 'Module', detail: 'module copy', documentation: 'Shallow and deep copy operations (copy(), deepcopy()).' },
    { label: 'abc', kind: 'Module', detail: 'module abc', documentation: 'Abstract Base Classes infrastructure (ABC, @abstractmethod).' },
    { label: 'contextlib', kind: 'Module', detail: 'module contextlib', documentation: 'Utilities for with-statement contexts (@contextmanager, closing, suppress).' },
    { label: 'shutil', kind: 'Module', detail: 'module shutil', documentation: 'High-level file operations (copy, copytree, rmtree, move, which).' },
    { label: 'glob', kind: 'Module', detail: 'module glob', documentation: 'Unix style pathname pattern expansion.' },
    { label: 'string', kind: 'Module', detail: 'module string', documentation: 'Common string operations and character constants.' },
    { label: 'pickle', kind: 'Module', detail: 'module pickle', documentation: 'Python object serialization and deserialization.' },
    { label: 'asyncio', kind: 'Module', detail: 'module asyncio', documentation: 'Asynchronous I/O, event loop, coroutines, and tasks.' },
    { label: 'textwrap', kind: 'Module', detail: 'module textwrap', documentation: 'Text wrapping and filling.' },
    { label: 'statistics', kind: 'Module', detail: 'module statistics', documentation: 'Mathematical statistics functions (mean, median, mode, stdev, variance).' }
]

// ---------------------------------------------------------------------------
// 3. Module Member Completions (post "module." or "from module import ...")
// ---------------------------------------------------------------------------

export const PYTHON_MODULE_MEMBERS: Record<string, PythonCompletion[]> = {
    os: [
        { label: 'path', kind: 'Module', detail: 'os.path', documentation: 'Common pathname manipulations.' },
        { label: 'getcwd', kind: 'Function', detail: 'os.getcwd() -> str', documentation: 'Return a unicode string representing the current working directory.' },
        { label: 'listdir', kind: 'Function', detail: 'os.listdir(path=".") -> list', documentation: 'Return a list containing the names of the files in the directory.' },
        { label: 'mkdir', kind: 'Function', detail: 'os.mkdir(path, mode=0o777)', documentation: 'Create a directory named path with the given numeric mode.' },
        { label: 'makedirs', kind: 'Function', detail: 'os.makedirs(name, mode=0o777, exist_ok=False)', documentation: 'Super-mkdir; create-directory recursive.' },
        { label: 'remove', kind: 'Function', detail: 'os.remove(path)', documentation: 'Remove (delete) the file path.' },
        { label: 'rename', kind: 'Function', detail: 'os.rename(src, dst)', documentation: 'Rename the file or directory src to dst.' },
        { label: 'environ', kind: 'Variable', detail: 'os.environ: dict', documentation: 'A mapping object representing the string environment.' },
        { label: 'getenv', kind: 'Function', detail: 'os.getenv(key, default=None)', documentation: 'Get an environment variable, return None if it doesn\'t exist.' },
        { label: 'system', kind: 'Function', detail: 'os.system(command) -> int', documentation: 'Execute the command in a subshell.' },
        { label: 'walk', kind: 'Function', detail: 'os.walk(top, topdown=True, onerror=None, followlinks=False)', documentation: 'Directory tree generator yielding (dirpath, dirnames, filenames).' },
        { label: 'sep', kind: 'Constant', detail: 'os.sep: str', documentation: 'The character used by the operating system to separate pathname components.' }
    ],
    'os.path': [
        { label: 'join', kind: 'Function', detail: 'os.path.join(path, *paths) -> str', documentation: 'Join two or more pathname components inserting os.sep as needed.' },
        { label: 'exists', kind: 'Function', detail: 'os.path.exists(path) -> bool', documentation: 'Test whether a path exists. Returns False for broken symbolic links.' },
        { label: 'isfile', kind: 'Function', detail: 'os.path.isfile(path) -> bool', documentation: 'Return True if path is an existing regular file.' },
        { label: 'isdir', kind: 'Function', detail: 'os.path.isdir(path) -> bool', documentation: 'Return True if path is an existing directory.' },
        { label: 'basename', kind: 'Function', detail: 'os.path.basename(path) -> str', documentation: 'Returns the final component of a pathname.' },
        { label: 'dirname', kind: 'Function', detail: 'os.path.dirname(path) -> str', documentation: 'Returns the directory component of a pathname.' },
        { label: 'abspath', kind: 'Function', detail: 'os.path.abspath(path) -> str', documentation: 'Return an absolute or normalized pathname.' },
        { label: 'splitext', kind: 'Function', detail: 'os.path.splitext(path) -> (root, ext)', documentation: 'Split the pathname path into a pair (root, ext) such that root + ext == path.' }
    ],
    sys: [
        { label: 'argv', kind: 'Variable', detail: 'sys.argv: list[str]', documentation: 'The list of command line arguments passed to a Python script.' },
        { label: 'exit', kind: 'Function', detail: 'sys.exit([status])', documentation: 'Exit the interpreter by raising SystemExit(status).' },
        { label: 'path', kind: 'Variable', detail: 'sys.path: list[str]', documentation: 'A list of strings that specifies the search path for modules.' },
        { label: 'stdin', kind: 'Variable', detail: 'sys.stdin', documentation: 'Standard input stream file object.' },
        { label: 'stdout', kind: 'Variable', detail: 'sys.stdout', documentation: 'Standard output stream file object.' },
        { label: 'stderr', kind: 'Variable', detail: 'sys.stderr', documentation: 'Standard error stream file object.' },
        { label: 'version', kind: 'Constant', detail: 'sys.version: str', documentation: 'A string containing the version number of the Python interpreter.' },
        { label: 'platform', kind: 'Constant', detail: 'sys.platform: str', documentation: 'An identifier for the platform on which Python is running.' }
    ],
    math: [
        { label: 'pi', kind: 'Constant', detail: 'math.pi = 3.141592653589793', documentation: 'The mathematical constant π.' },
        { label: 'e', kind: 'Constant', detail: 'math.e = 2.718281828459045', documentation: 'The mathematical constant e.' },
        { label: 'sqrt', kind: 'Function', detail: 'math.sqrt(x) -> float', documentation: 'Return the square root of x.' },
        { label: 'ceil', kind: 'Function', detail: 'math.ceil(x) -> int', documentation: 'Return the ceiling of x as an Integral.' },
        { label: 'floor', kind: 'Function', detail: 'math.floor(x) -> int', documentation: 'Return the floor of x as an Integral.' },
        { label: 'sin', kind: 'Function', detail: 'math.sin(x) -> float', documentation: 'Return the sine of x (measured in radians).' },
        { label: 'cos', kind: 'Function', detail: 'math.cos(x) -> float', documentation: 'Return the cosine of x (measured in radians).' },
        { label: 'tan', kind: 'Function', detail: 'math.tan(x) -> float', documentation: 'Return the tangent of x (measured in radians).' },
        { label: 'radians', kind: 'Function', detail: 'math.radians(x) -> float', documentation: 'Convert angles from degrees to radians.' },
        { label: 'degrees', kind: 'Function', detail: 'math.degrees(x) -> float', documentation: 'Convert angles from radians to degrees.' },
        { label: 'log', kind: 'Function', detail: 'math.log(x[, base]) -> float', documentation: 'Return the logarithm of x to the given base.' },
        { label: 'log10', kind: 'Function', detail: 'math.log10(x) -> float', documentation: 'Return the base 10 logarithm of x.' },
        { label: 'gcd', kind: 'Function', detail: 'math.gcd(*integers) -> int', documentation: 'Greatest Common Divisor.' },
        { label: 'factorial', kind: 'Function', detail: 'math.factorial(n) -> int', documentation: 'Find n!.' }
    ],
    json: [
        { label: 'loads', kind: 'Function', detail: 'json.loads(s, *, cls=None, object_hook=None, ...)', documentation: 'Deserialize s (a str, bytes or bytearray instance containing a JSON document) to a Python object.' },
        { label: 'dumps', kind: 'Function', detail: 'json.dumps(obj, *, indent=None, sort_keys=False, ...)', documentation: 'Serialize obj to a JSON formatted str.' },
        { label: 'load', kind: 'Function', detail: 'json.load(fp, *, cls=None, object_hook=None, ...)', documentation: 'Deserialize fp (a .read()-supporting file-like object containing a JSON document) to a Python object.' },
        { label: 'dump', kind: 'Function', detail: 'json.dump(obj, fp, *, indent=None, sort_keys=False, ...)', documentation: 'Serialize obj as a JSON formatted stream to fp.' }
    ],
    random: [
        { label: 'randint', kind: 'Function', detail: 'random.randint(a, b) -> int', documentation: 'Return a random integer N such that a <= N <= b.' },
        { label: 'choice', kind: 'Function', detail: 'random.choice(seq) -> element', documentation: 'Choose a random element from a non-empty sequence.' },
        { label: 'shuffle', kind: 'Function', detail: 'random.shuffle(x)', documentation: 'Shuffle list x in place, and return None.' },
        { label: 'random', kind: 'Function', detail: 'random.random() -> float', documentation: 'Return the next random floating point number in the range 0.0 <= X < 1.0.' },
        { label: 'sample', kind: 'Function', detail: 'random.sample(population, k) -> list', documentation: 'Chooses k unique random elements from a population sequence or set.' },
        { label: 'uniform', kind: 'Function', detail: 'random.uniform(a, b) -> float', documentation: 'Get a random number in the range [a, b) or [a, b] depending on rounding.' },
        { label: 'randrange', kind: 'Function', detail: 'random.randrange(start, stop=None, step=1) -> int', documentation: 'Choose a random item from range(start, stop[, step]).' }
    ],
    re: [
        { label: 'match', kind: 'Function', detail: 're.match(pattern, string, flags=0)', documentation: 'Try to apply the pattern at the start of the string, returning a Match object, or None.' },
        { label: 'search', kind: 'Function', detail: 're.search(pattern, string, flags=0)', documentation: 'Scan through string looking for a match to the pattern, returning a Match object, or None.' },
        { label: 'findall', kind: 'Function', detail: 're.findall(pattern, string, flags=0) -> list', documentation: 'Return all non-overlapping matches of pattern in string, as a list of strings or tuples.' },
        { label: 'finditer', kind: 'Function', detail: 're.finditer(pattern, string, flags=0) -> iterator', documentation: 'Return an iterator yielding Match objects over all non-overlapping matches.' },
        { label: 'sub', kind: 'Function', detail: 're.sub(pattern, repl, string, count=0, flags=0) -> str', documentation: 'Return the string obtained by replacing the leftmost non-overlapping occurrences of pattern.' },
        { label: 'split', kind: 'Function', detail: 're.split(pattern, string, maxsplit=0, flags=0) -> list', documentation: 'Split string by the occurrences of pattern.' },
        { label: 'compile', kind: 'Function', detail: 're.compile(pattern, flags=0) -> Pattern', documentation: 'Compile a regular expression pattern into a regular expression object.' }
    ],
    time: [
        { label: 'time', kind: 'Function', detail: 'time.time() -> float', documentation: 'Return the current time in seconds since the Epoch.' },
        { label: 'sleep', kind: 'Function', detail: 'time.sleep(secs)', documentation: 'Delay execution for a given number of seconds.' },
        { label: 'perf_counter', kind: 'Function', detail: 'time.perf_counter() -> float', documentation: 'Performance counter for benchmarking with highest available resolution.' },
        { label: 'ctime', kind: 'Function', detail: 'time.ctime([secs]) -> str', documentation: 'Convert a time in seconds since the Epoch to a string in local time.' }
    ],
    datetime: [
        { label: 'datetime', kind: 'Class', detail: 'class datetime.datetime(year, month, day, hour=0, minute=0, second=0, microsecond=0, tzinfo=None)', documentation: 'Combines date and time attributes.' },
        { label: 'date', kind: 'Class', detail: 'class datetime.date(year, month, day)', documentation: 'Represents a date (year, month and day) in an idealized calendar.' },
        { label: 'time', kind: 'Class', detail: 'class datetime.time(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)', documentation: 'Represents a (local) time of day, independent of any particular day.' },
        { label: 'timedelta', kind: 'Class', detail: 'class datetime.timedelta(days=0, seconds=0, microseconds=0, milliseconds=0, minutes=0, hours=0, weeks=0)', documentation: 'A duration expressing the difference between two date, time, or datetime instances.' }
    ],
    pathlib: [
        { label: 'Path', kind: 'Class', detail: 'class pathlib.Path(*pathsegments)', documentation: 'PurePath subclass that can also perform system calls on path objects.' },
        { label: 'PurePath', kind: 'Class', detail: 'class pathlib.PurePath(*pathsegments)', documentation: 'Pure pathname manipulation without filesystem calls.' }
    ],
    csv: [
        { label: 'reader', kind: 'Function', detail: 'csv.reader(csvfile, dialect="excel", **fmtparams)', documentation: 'Return a reader object which iterates over lines in the given csvfile.' },
        { label: 'writer', kind: 'Function', detail: 'csv.writer(csvfile, dialect="excel", **fmtparams)', documentation: 'Return a writer object responsible for converting data into delimited strings on the given file-like object.' },
        { label: 'DictReader', kind: 'Class', detail: 'class csv.DictReader(f, fieldnames=None, restkey=None, restval=None, dialect="excel", *args, **kwds)', documentation: 'Create an object that operates like a regular reader but maps the information in each row to a dict.' },
        { label: 'DictWriter', kind: 'Class', detail: 'class csv.DictWriter(f, fieldnames, restval="", extrasaction="raise", dialect="excel", *args, **kwds)', documentation: 'Create an object which operates like a regular writer but maps dictionaries onto output rows.' }
    ],
    shutil: [
        { label: 'copy', kind: 'Function', detail: 'shutil.copy(src, dst, *, follow_symlinks=True)', documentation: 'Copy data and mode bits ("cp src dst").' },
        { label: 'copy2', kind: 'Function', detail: 'shutil.copy2(src, dst, *, follow_symlinks=True)', documentation: 'Copy data and all file metadata ("cp -p src dst").' },
        { label: 'copytree', kind: 'Function', detail: 'shutil.copytree(src, dst, symlinks=False, ignore=None, ...)', documentation: 'Recursively copy an entire directory tree.' },
        { label: 'rmtree', kind: 'Function', detail: 'shutil.rmtree(path, ignore_errors=False, onerror=None)', documentation: 'Delete an entire directory tree.' },
        { label: 'move', kind: 'Function', detail: 'shutil.move(src, dst, copy_function=copy2)', documentation: 'Recursively move a file or directory to another location.' },
        { label: 'which', kind: 'Function', detail: 'shutil.which(cmd, mode=os.F_OK | os.X_OK, path=None)', documentation: 'Given a command, return the path to the executable, or None if not found.' }
    ],
    collections: [
        { label: 'defaultdict', kind: 'Class', detail: 'class collections.defaultdict(default_factory=None, /[, ...])', documentation: 'dict subclass that calls a factory function to supply missing values.' },
        { label: 'Counter', kind: 'Class', detail: 'class collections.Counter([iterable-or-mapping])', documentation: 'Dict subclass for counting hashable items.' },
        { label: 'deque', kind: 'Class', detail: 'class collections.deque([iterable[, maxlen]])', documentation: 'List-like container with fast appends and pops on either end.' },
        { label: 'namedtuple', kind: 'Function', detail: 'collections.namedtuple(typename, field_names, ...)', documentation: 'Returns a new subclass of tuple with named fields.' }
    ],
    itertools: [
        { label: 'count', kind: 'Function', detail: 'itertools.count(start=0, step=1)', documentation: 'Make an iterator that returns evenly spaced values starting with start.' },
        { label: 'cycle', kind: 'Function', detail: 'itertools.cycle(iterable)', documentation: 'Make an iterator returning elements from the iterable and saving a copy of each.' },
        { label: 'chain', kind: 'Function', detail: 'itertools.chain(*iterables)', documentation: 'Make an iterator that returns elements from the first iterable until exhausted, then from the next.' },
        { label: 'product', kind: 'Function', detail: 'itertools.product(*iterables, repeat=1)', documentation: 'Cartesian product of input iterables. Equivalent to nested for-loops.' },
        { label: 'permutations', kind: 'Function', detail: 'itertools.permutations(iterable, r=None)', documentation: 'Return successive r length permutations of elements in the iterable.' },
        { label: 'combinations', kind: 'Function', detail: 'itertools.combinations(iterable, r)', documentation: 'Return r length subsequences of elements from the input iterable.' }
    ],
    functools: [
        { label: 'lru_cache', kind: 'Function', detail: '@functools.lru_cache(maxsize=128, typed=False)', documentation: 'Decorator to wrap a function with a memoizing callable that saves up to the maxsize most recent calls.' },
        { label: 'partial', kind: 'Function', detail: 'functools.partial(func, /, *args, **keywords)', documentation: 'Return a new partial object which when called will behave like func called with the positional args and keyword args.' },
        { label: 'reduce', kind: 'Function', detail: 'functools.reduce(function, iterable[, initializer])', documentation: 'Apply function of two arguments cumulatively to the items of iterable from left to right.' },
        { label: 'wraps', kind: 'Function', detail: '@functools.wraps(wrapped, ...)', documentation: 'Decorator factory to apply update_wrapper() to a wrapper function.' }
    ],
    typing: [
        { label: 'List', kind: 'Class', detail: 'List[T]', documentation: 'Generic list type for type annotations.' },
        { label: 'Dict', kind: 'Class', detail: 'Dict[KT, VT]', documentation: 'Generic dictionary type for type annotations.' },
        { label: 'Tuple', kind: 'Class', detail: 'Tuple[T, ...]', documentation: 'Generic tuple type for type annotations.' },
        { label: 'Set', kind: 'Class', detail: 'Set[T]', documentation: 'Generic set type for type annotations.' },
        { label: 'Optional', kind: 'Class', detail: 'Optional[T]', documentation: 'Optional[X] is equivalent to Union[X, None].' },
        { label: 'Union', kind: 'Class', detail: 'Union[T1, T2]', documentation: 'Union type; Union[X, Y] means either X or Y.' },
        { label: 'Any', kind: 'Class', detail: 'Any', documentation: 'Special type indicating an unconstrained type.' },
        { label: 'Callable', kind: 'Class', detail: 'Callable[[Arg1, Arg2], ReturnType]', documentation: 'Callable type; Callable[[int], str] is a function of (int) -> str.' }
    ]
}

export const PYTHON_FILE_METHODS: PythonCompletion[] = [
    { label: 'read', kind: 'Function', detail: 'f.read(size=-1) -> str', documentation: 'Read at most size characters/bytes from the stream.' },
    { label: 'readline', kind: 'Function', detail: 'f.readline(size=-1) -> str', documentation: 'Read until newline or EOF.' },
    { label: 'readlines', kind: 'Function', detail: 'f.readlines(hint=-1) -> list[str]', documentation: 'Return a list of lines from the stream.' },
    { label: 'write', kind: 'Function', detail: 'f.write(text) -> int', documentation: 'Write string to stream and return the number of characters written.' },
    { label: 'writelines', kind: 'Function', detail: 'f.writelines(lines)', documentation: 'Write a list of lines to the stream.' },
    { label: 'close', kind: 'Function', detail: 'f.close()', documentation: 'Flush and close the IO object.' },
    { label: 'flush', kind: 'Function', detail: 'f.flush()', documentation: 'Flush the write buffers of the stream if applicable.' },
    { label: 'seek', kind: 'Function', detail: 'f.seek(cookie, whence=0) -> int', documentation: 'Change stream position.' },
    { label: 'tell', kind: 'Function', detail: 'f.tell() -> int', documentation: 'Return the current stream position.' }
]

export const PYTHON_PATH_INSTANCE_MEMBERS: PythonCompletion[] = [
    { label: 'exists', kind: 'Function', detail: 'path.exists() -> bool', documentation: 'Whether this path exists or points to an existing directory or file.' },
    { label: 'is_file', kind: 'Function', detail: 'path.is_file() -> bool', documentation: 'Whether this path is a regular file.' },
    { label: 'is_dir', kind: 'Function', detail: 'path.is_dir() -> bool', documentation: 'Whether this path is a directory.' },
    { label: 'read_text', kind: 'Function', detail: 'path.read_text(encoding="utf-8") -> str', documentation: 'Open the file in text mode, read it, and close the file.' },
    { label: 'write_text', kind: 'Function', detail: 'path.write_text(data, encoding="utf-8") -> int', documentation: 'Open the file in text mode, write to it, and close the file.' },
    { label: 'read_bytes', kind: 'Function', detail: 'path.read_bytes() -> bytes', documentation: 'Open the file in bytes mode, read it, and close the file.' },
    { label: 'write_bytes', kind: 'Function', detail: 'path.write_bytes(data) -> int', documentation: 'Open the file in bytes mode, write to it, and close the file.' },
    { label: 'mkdir', kind: 'Function', detail: 'path.mkdir(mode=0o777, parents=False, exist_ok=False)', documentation: 'Create a new directory at this given path.' },
    { label: 'unlink', kind: 'Function', detail: 'path.unlink(missing_ok=False)', documentation: 'Remove this file or symbolic link.' },
    { label: 'parent', kind: 'Variable', detail: 'path.parent: Path', documentation: 'The logical parent of the path.' },
    { label: 'name', kind: 'Variable', detail: 'path.name: str', documentation: 'The final path component, if any.' },
    { label: 'stem', kind: 'Variable', detail: 'path.stem: str', documentation: 'The final path component, minus its last suffix.' },
    { label: 'suffix', kind: 'Variable', detail: 'path.suffix: str', documentation: 'The path extension of the final component, if any.' }
]

// ---------------------------------------------------------------------------
// 4. Python Snippets
// ---------------------------------------------------------------------------

export const PYTHON_SNIPPETS: PythonSnippet[] = [
    {
        label: 'def',
        detail: 'Function definition',
        documentation: 'Define a function with arguments and a docstring.',
        insertText: 'def ${1:function_name}(${2:args}):\n    """${3:Docstring}"""\n    ${0:pass}'
    },
    {
        label: 'class',
        detail: 'Class definition',
        documentation: 'Define a new class with an __init__ constructor.',
        insertText: 'class ${1:ClassName}:\n    """${2:Docstring}"""\n\n    def __init__(self${3:, args}):\n        ${0:pass}'
    },
    {
        label: 'main',
        detail: 'if __name__ == "__main__": block',
        documentation: 'Boilerplate entry point for executable Python scripts.',
        insertText: 'if __name__ == "__main__":\n    ${0:main()}'
    },
    {
        label: 'for',
        detail: 'For in loop',
        documentation: 'Iterate over items in an iterable.',
        insertText: 'for ${1:item} in ${2:iterable}:\n    ${0:pass}'
    },
    {
        label: 'forin',
        detail: 'For in with enumerate',
        documentation: 'Iterate with index and value using enumerate().',
        insertText: 'for ${1:i}, ${2:item} in enumerate(${3:iterable}):\n    ${0:pass}'
    },
    {
        label: 'while',
        detail: 'While loop',
        documentation: 'Execute loop body while condition evaluates to true.',
        insertText: 'while ${1:condition}:\n    ${0:pass}'
    },
    {
        label: 'try',
        detail: 'Try / Except block',
        documentation: 'Catch and handle exceptions.',
        insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${0:print(e)}'
    },
    {
        label: 'tryf',
        detail: 'Try / Except / Finally block',
        documentation: 'Handle exceptions with guaranteed cleanup execution.',
        insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:print(e)}\nfinally:\n    ${0:pass}'
    },
    {
        label: 'with',
        detail: 'With statement (context manager)',
        documentation: 'Open and safely manage resources such as files.',
        insertText: 'with open(${1:"file.txt"}, "${2:r}") as ${3:f}:\n    ${0:content = f.read()}'
    },
    {
        label: 'readfile',
        detail: 'Read text file line-by-line',
        documentation: 'Safely read a text file using a with-open block.',
        insertText: 'with open(${1:"data.txt"}, "r", encoding="utf-8") as ${2:f}:\n    for ${3:line} in ${2:f}:\n        ${0:print(${3:line}.strip())}'
    },
    {
        label: 'writefile',
        detail: 'Write text file',
        documentation: 'Write text to a file using UTF-8 encoding.',
        insertText: 'with open(${1:"output.txt"}, "w", encoding="utf-8") as ${2:f}:\n    ${2:f}.write(${0:"Hello, World!\\n"})'
    },
    {
        label: 'appendfile',
        detail: 'Append text to file',
        documentation: 'Append text to a file using mode "a".',
        insertText: 'with open(${1:"output.txt"}, "a", encoding="utf-8") as ${2:f}:\n    ${2:f}.write(${0:"Log entry\\n"})'
    },
    {
        label: 'readcsv',
        detail: 'Read CSV file',
        documentation: 'Read rows from a CSV file using the csv module.',
        insertText: 'import csv\n\nwith open(${1:"data.csv"}, mode="r", encoding="utf-8") as ${2:f}:\n    reader = csv.reader(${2:f})\n    header = next(reader)\n    for row in reader:\n        ${0:print(row)}'
    },
    {
        label: 'writecsv',
        detail: 'Write CSV file',
        documentation: 'Write data rows to a CSV file using csv.writer.',
        insertText: 'import csv\n\nwith open(${1:"output.csv"}, mode="w", newline="", encoding="utf-8") as ${2:f}:\n    writer = csv.writer(${2:f})\n    writer.writerow([${1:"Name"}, ${2:"Score"}])\n    ${0:writer.writerow(["Alice", 100])}'
    },
    {
        label: 'readjson',
        detail: 'Read JSON file',
        documentation: 'Parse and load JSON data from a file using json.load.',
        insertText: 'import json\n\nwith open(${1:"data.json"}, "r", encoding="utf-8") as ${2:f}:\n    data = json.load(${2:f})\n    ${0:print(data)}'
    },
    {
        label: 'writejson',
        detail: 'Write JSON file',
        documentation: 'Serialize and dump a Python dictionary or list to a JSON file.',
        insertText: 'import json\n\nwith open(${1:"output.json"}, "w", encoding="utf-8") as ${2:f}:\n    json.dump(${1:data}, ${2:f}, indent=4)\n    $0'
    },
    {
        label: 'pathlib-read',
        detail: 'Read file using pathlib.Path',
        documentation: 'Read file contents using modern pathlib.Path.read_text.',
        insertText: 'from pathlib import Path\n\npath = Path(${1:"data.txt"})\nif path.exists():\n    content = path.read_text(encoding="utf-8")\n    ${0:print(content)}'
    },
    {
        label: 'pathlib-write',
        detail: 'Write file using pathlib.Path',
        documentation: 'Write text to file using pathlib.Path.write_text.',
        insertText: 'from pathlib import Path\n\npath = Path(${1:"output.txt"})\npath.write_text(${2:"Hello, World!"}, encoding="utf-8")\n$0'
    },
    {
        label: 'lc',
        detail: 'List comprehension',
        documentation: 'Construct a new list via inline for expression.',
        insertText: '[${1:expr} for ${2:item} in ${3:iterable}]'
    },
    {
        label: 'dc',
        detail: 'Dictionary comprehension',
        documentation: 'Construct a new dictionary via inline for expression.',
        insertText: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}'
    },
    {
        label: 'sc',
        detail: 'Set comprehension',
        documentation: 'Construct a new set via inline for expression.',
        insertText: '{${1:expr} for ${2:item} in ${3:iterable}}'
    },
    {
        label: 'prop',
        detail: 'Property getter & setter',
        documentation: 'Pythonic property with getter and setter methods.',
        insertText: '@property\ndef ${1:name}(self):\n    return self._${1:name}\n\n@${1:name}.setter\ndef ${1:name}(self, value):\n    self._${1:name} = value'
    },
    {
        label: 'deco',
        detail: 'Decorator function',
        documentation: 'Define a function decorator with functools.wraps.',
        insertText: 'from functools import wraps\n\ndef ${1:decorator_name}(func):\n    @wraps(func)\n    def wrapper(*args, **kwargs):\n        ${2:# Before}\n        result = func(*args, **kwargs)\n        ${3:# After}\n        return result\n    return wrapper'
    },
    {
        label: 'lambda',
        detail: 'Lambda expression',
        documentation: 'Define an anonymous inline lambda function.',
        insertText: 'lambda ${1:x}: ${0:x}'
    }
]

// ---------------------------------------------------------------------------
// 5. Local Symbol & Variable Extraction
// ---------------------------------------------------------------------------

export function extractPythonLocalSymbols(code: string): {
    variables: PythonVariableSymbol[]
    functions: PythonFunctionSymbol[]
    classes: PythonClassSymbol[]
} {
    const variables: PythonVariableSymbol[] = []
    const functions: PythonFunctionSymbol[] = []
    const classes: PythonClassSymbol[] = []

    const lines = code.split('\n')
    const seenVars = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNum = i + 1

        // 1. Classes: class ClassName(BaseClass):
        const classMatch = line.match(/^([ \t]*)class\s+([a-zA-Z_]\w*)(?:\((.*?)\))?:/)
        if (classMatch) {
            const indent = classMatch[1].length
            const className = classMatch[2]
            const bases = classMatch[3]
                ? classMatch[3].split(',').map(s => s.trim()).filter(Boolean)
                : []
            classes.push({
                name: className,
                baseClasses: bases,
                methods: [],
                line: lineNum,
                column: indent + 1
            })
            continue
        }

        // 2. Functions: def func_name(a, b=1) -> None:
        const funcMatch = line.match(/^([ \t]*)def\s+([a-zA-Z_]\w*)\s*\((.*?)\)(?:\s*->\s*[^:]+)?:/)
        if (funcMatch) {
            const indent = funcMatch[1].length
            const funcName = funcMatch[2]
            const rawParams = funcMatch[3]
            const params = rawParams
                .split(',')
                .map(p => p.trim().split('=')[0].trim().split(':')[0].trim())
                .filter(p => Boolean(p) && p !== 'self' && p !== 'cls')

            functions.push({
                name: funcName,
                params,
                line: lineNum,
                column: indent + 1
            })

            // Add parameters as variable symbols
            for (const param of params) {
                if (!seenVars.has(param)) {
                    seenVars.add(param)
                    variables.push({
                        name: param,
                        kind: 'param',
                        line: lineNum,
                        column: line.indexOf(param) + 1,
                        detail: `parameter in ${funcName}()`
                    })
                }
            }
            continue
        }

        // 3. Loop variables: for i, item in enumerate(iterable): or for x in range(10):
        const forMatch = line.match(/^[ \t]*for\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s+in\b/)
        if (forMatch) {
            const vars = forMatch[1].split(',').map(s => s.trim()).filter(Boolean)
            for (const v of vars) {
                if (!seenVars.has(v)) {
                    seenVars.add(v)
                    variables.push({
                        name: v,
                        kind: 'loop',
                        line: lineNum,
                        column: line.indexOf(v) + 1,
                        detail: 'loop variable'
                    })
                }
            }
        }

        // 4. With statement: with open(...) as f:
        const withMatch = line.match(/^[ \t]*with\s+.+?\s+as\s+([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*):/)
        if (withMatch) {
            const vars = withMatch[1].split(',').map(s => s.trim()).filter(Boolean)
            for (const v of vars) {
                if (!seenVars.has(v)) {
                    seenVars.add(v)
                    variables.push({
                        name: v,
                        kind: 'with',
                        line: lineNum,
                        column: line.indexOf(v) + 1,
                        detail: 'context manager variable'
                    })
                }
            }
        }

        // 5. Exception handling: except Exception as e:
        const exceptMatch = line.match(/^[ \t]*except\s+\w+(?:\s+as\s+([a-zA-Z_]\w*))?:/)
        if (exceptMatch && exceptMatch[1]) {
            const v = exceptMatch[1]
            if (!seenVars.has(v)) {
                seenVars.add(v)
                variables.push({
                    name: v,
                    kind: 'except',
                    line: lineNum,
                    column: line.indexOf(v) + 1,
                    detail: 'exception variable'
                })
            }
        }

        // 6. Variable assignment: x = 10 or x: int = 10 or x, y = 1, 2
        const assignMatch = line.match(/^([ \t]*)([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*(?::\s*[^=]+)?\s*=(?!=)\s*(.*)$/)
        if (assignMatch) {
            const rawVars = assignMatch[2].split(',').map(s => s.trim()).filter(Boolean)
            const valPreview = assignMatch[3]?.trim()?.slice(0, 30)
            for (const v of rawVars) {
                // Ignore Python keywords
                if (['self', 'cls', 'True', 'False', 'None'].includes(v)) continue
                if (!seenVars.has(v)) {
                    seenVars.add(v)
                    variables.push({
                        name: v,
                        kind: 'local',
                        line: lineNum,
                        column: line.indexOf(v) + 1,
                        detail: valPreview ? `= ${valPreview}` : 'variable'
                    })
                }
            }
        }
    }

    return { variables, functions, classes }
}

// ---------------------------------------------------------------------------
// 6. Post-Import Completions
// ---------------------------------------------------------------------------

export function getPostImportCompletions(moduleName: string): PythonCompletion[] {
    return PYTHON_MODULE_MEMBERS[moduleName] || []
}

export function getPythonBuiltinCompletions(): PythonCompletion[] {
    return PYTHON_BUILTINS
}

export function getPythonModuleCompletions(): PythonCompletion[] {
    return PYTHON_MODULES
}

export function getPythonSnippets(): PythonSnippet[] {
    return PYTHON_SNIPPETS
}

/**
 * Main completion provider function for Python in Monaco editor.
 */
export function getPythonCompletionItems(model: any, position: any, monaco: any): { suggestions: any[] } {
    const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
    })

    const word = model.getWordUntilPosition(position)
    const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
    }

    const suggestions: any[] = []

    // 1. From ... import ... completion
    const fromImportMatch = textUntilPosition.match(/^\s*from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_]*)$/)
    if (fromImportMatch) {
        const modName = fromImportMatch[1]
        const members = getPostImportCompletions(modName)
        for (const m of members) {
            suggestions.push({
                label: m.label,
                kind: m.kind === 'Function' ? monaco.languages.CompletionItemKind.Function
                    : m.kind === 'Class' ? monaco.languages.CompletionItemKind.Class
                        : m.kind === 'Constant' ? monaco.languages.CompletionItemKind.Constant
                            : monaco.languages.CompletionItemKind.Variable,
                detail: m.detail,
                documentation: m.documentation,
                insertText: m.label,
                range,
                sortText: '0_' + m.label
            })
        }
        return { suggestions }
    }

    // 2. Import module completion (import math, import os, etc.)
    const importMatch = textUntilPosition.match(/^\s*import\s+([a-zA-Z0-9_.]*)$/)
    if (importMatch) {
        for (const mod of PYTHON_MODULES) {
            suggestions.push({
                label: mod.label,
                kind: monaco.languages.CompletionItemKind.Module,
                detail: mod.detail,
                documentation: mod.documentation,
                insertText: mod.label,
                range,
                sortText: '0_' + mod.label
            })
        }
        return { suggestions }
    }

    // 3. Dot-access member completion (e.g. os., math., sys., f., path.)
    const dotMatch = textUntilPosition.match(/([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\.([a-zA-Z_]\w*)?$/)
    if (dotMatch) {
        const target = dotMatch[1]
        let members = getPostImportCompletions(target)
        if (!members || members.length === 0) {
            const lower = target.toLowerCase()
            if (['f', 'file', 'fp', 'infile', 'outfile', 'in_file', 'out_file', 'stream', 'reader', 'writer'].some(id => lower === id || lower.endsWith('_' + id) || lower.endsWith('file'))) {
                members = PYTHON_FILE_METHODS
            } else if (lower.includes('path')) {
                members = PYTHON_PATH_INSTANCE_MEMBERS
            }
        }
        if (members && members.length > 0) {
            for (const m of members) {
                const isFunc = m.kind === 'Function'
                suggestions.push({
                    label: m.label,
                    kind: isFunc ? monaco.languages.CompletionItemKind.Function
                        : m.kind === 'Class' ? monaco.languages.CompletionItemKind.Class
                            : m.kind === 'Constant' ? monaco.languages.CompletionItemKind.Constant
                                : monaco.languages.CompletionItemKind.Variable,
                    detail: m.detail,
                    documentation: m.documentation,
                    insertText: isFunc ? `${m.label}($1)` : m.label,
                    insertTextRules: isFunc ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
                    range,
                    sortText: '0_' + m.label
                })
            }
            return { suggestions }
        }
    }

    // 4. General Scope Completions

    // 4A. Local Variables & Parameters
    const fullCode = model.getValue()
    const { variables, functions, classes } = extractPythonLocalSymbols(fullCode)

    for (const v of variables) {
        suggestions.push({
            label: v.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: v.detail || 'variable',
            insertText: v.name,
            range,
            sortText: '0_' + v.name
        })
    }

    // 4B. Local Functions
    for (const f of functions) {
        suggestions.push({
            label: f.name,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: `def ${f.name}(${f.params.join(', ')})`,
            insertText: `${f.name}(\${1})`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: '1_' + f.name
        })
    }

    // 4C. Local Classes
    for (const c of classes) {
        suggestions.push({
            label: c.name,
            kind: monaco.languages.CompletionItemKind.Class,
            detail: `class ${c.name}`,
            insertText: c.name,
            range,
            sortText: '1_' + c.name
        })
    }

    // 4D. Python Built-ins
    for (const b of PYTHON_BUILTINS) {
        const isFunc = b.kind === 'Function'
        suggestions.push({
            label: b.label,
            kind: isFunc ? monaco.languages.CompletionItemKind.Function
                : b.kind === 'Class' ? monaco.languages.CompletionItemKind.Class
                    : monaco.languages.CompletionItemKind.Constant,
            detail: b.detail,
            documentation: b.documentation,
            insertText: isFunc ? `${b.label}(\${1})` : b.label,
            insertTextRules: isFunc ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            range,
            sortText: '2_' + b.label
        })
    }

    // 4E. Standard Library Modules
    for (const m of PYTHON_MODULES) {
        suggestions.push({
            label: m.label,
            kind: monaco.languages.CompletionItemKind.Module,
            detail: m.detail,
            documentation: m.documentation,
            insertText: m.label,
            range,
            sortText: '3_' + m.label
        })
    }

    // 4F. Snippets
    for (const s of PYTHON_SNIPPETS) {
        suggestions.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: s.detail,
            documentation: s.documentation,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: '4_' + s.label
        })
    }

    return { suggestions }
}

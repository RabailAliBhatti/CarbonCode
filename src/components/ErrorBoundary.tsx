import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-screen bg-editor-bg text-text-primary">
                    <div className="text-center p-8">
                        <h1 className="text-xl font-bold mb-4 text-error">Something went wrong</h1>
                        <p className="text-text-secondary mb-6">{this.state.error?.message}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

export default ErrorBoundary

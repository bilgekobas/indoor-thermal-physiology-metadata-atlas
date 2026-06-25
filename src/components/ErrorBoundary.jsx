import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="m-10 max-w-3xl rounded border border-coreaccent/30 bg-white p-5 text-[13.5px] leading-relaxed">
          <div className="font-semibold text-coreaccent mb-2">This chapter could not render.</div>
          <div className="text-inkmid mb-3">
            The route loaded, but one of its figures raised a runtime error. The page is kept visible so the failing component can be diagnosed instead of producing a blank screen.
          </div>
          <pre className="font-data text-[11px] whitespace-pre-wrap text-inkfaint bg-paper border border-line rounded p-3 overflow-x-auto">
            {this.state.error?.message || String(this.state.error)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

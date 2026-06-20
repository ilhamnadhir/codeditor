import { useState } from 'react'
import reactLogo from './assets/react.svg'
import Editor from '@monaco-editor/react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Editor
    height="100vh"
    width="100vw"
    theme="vs-dark"
    />
  )
}

export default App

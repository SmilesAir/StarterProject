/* eslint-disable react/prop-types */
import React, { useEffect } from "react"
import { observer } from "mobx-react"
import { observable, runInAction } from "mobx"
import "./App.css"

if (import.meta.hot) {
    import.meta.hot.on(
      "vite:beforeUpdate",
      () => console.clear()
    );
}


const App = observer(class App extends React.Component {
    constructor() {
        super()
    }

    render() {
        return <h2>Starter Project</h2>
    }
})

export default App

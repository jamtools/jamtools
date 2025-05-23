Springboard was built out of the necessity of creating MIDI applications deployed in a fullstack web application context, and simultaneously allowing the application to run standalone in the browser for maximum portability. This dual requirement has shaped how the Springboard framework works, by maximizing the amount of code reuse across the different platforms.

Springboard uses the concept of [modules](./module-development.md) to encapsulate responsibilities of different pieces of code. A new Springboard project contains no modules by default. There are some predefined modules that you can import into your code, namely the modules defined by the [`@jamtools/core`](https://github.com/jamtools/jamtools/tree/main/packages/jamtools/core/modules) package at the time of writing.

What is a full-stack MIDI application? An application where there is a client-server architecture involved, and:
- there are MIDI instruments plugged into the desktop/server computer, and mobile/browser clients can interact via a user interface.
- or there are MIDI instruments connected to clients, and interacting with other clients that potentially also have MIDI instruments connected to them.

---

More information:

- [Developing a module](./module-development.md)
- [Deployment contexts](./deployment-contexts/deployment-contexts.md) - Single-player and multi-player

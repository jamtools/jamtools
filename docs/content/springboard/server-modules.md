You can hook into the framework's Hono server using the server module system.

Most business logic should go in the application/Maestro portion, though if http is ever directly required, you'll need an http server, which is where this comes in handy.

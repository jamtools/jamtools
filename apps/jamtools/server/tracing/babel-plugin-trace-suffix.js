// babel-plugin-auto-instrument.js
module.exports = function ({types: t}) {
  return {
    visitor: {
      Program(path, state) {
        state.importAdded = false;
      },
      FunctionDeclaration(path, state) {
        const functionName = path.node.id.name;
        if (functionName.endsWith('_trace')) {
          wrapFunction(path, functionName, state);
        }
      },
      VariableDeclarator(path, state) {
        if (
          t.isIdentifier(path.node.id) &&
          path.node.id.name.endsWith('_trace') &&
          (t.isFunctionExpression(path.node.init) || t.isArrowFunctionExpression(path.node.init))
        ) {
          wrapFunction(path, path.node.id.name, state);
        }
      },
      CallExpression(path, state) {
        const callee = path.node.callee;
        if (
          t.isMemberExpression(callee) &&
          (callee.object.name && (callee.object.name === 'app' || callee.object.name.toLowerCase().includes('router'))) &&
          (callee.property.name === 'get' ||
            callee.property.name === 'post' ||
            callee.property.name === 'put' ||
            callee.property.name === 'delete')
        ) {
          const handlerIndex = path.node.arguments.length - 1;
          const handler = path.node.arguments[handlerIndex];
          if (t.isFunctionExpression(handler) || t.isArrowFunctionExpression(handler)) {
            const functionName = `Express handler - ${path.node.arguments[0].value}`;
            const traceCall = t.callExpression(t.identifier('traceFunction'), [
              t.stringLiteral(functionName),
              handler,
              t.objectExpression([
                t.objectProperty(t.identifier('"http.method"'), t.stringLiteral(callee.property.name.toUpperCase())),
                t.objectProperty(t.identifier('"custom.attribute"'), t.stringLiteral('important-handler'))
              ])
            ]);
            path.node.arguments[handlerIndex] = traceCall;

            // Ensure traceFunction is imported
            if (!state.importAdded) {
              const importDeclaration = t.importDeclaration(
                [t.importSpecifier(t.identifier('traceFunction'), t.identifier('traceFunction'))],
                t.stringLiteral('@/trace-function')
              );
              path.findParent((p) => p.isProgram()).unshiftContainer('body', importDeclaration);
              state.importAdded = true;
            }
          }
        }
      },
    },
  };

  function wrapFunction(path, functionName, state) {
    const wrappedFunction = t.callExpression(t.identifier('traceFunction'), [
      t.stringLiteral(functionName),
      path.node.init || path.node,
    ]);

    if (!state.importAdded) {
      const importDeclaration = t.importDeclaration(
        [t.importSpecifier(t.identifier('traceFunction'), t.identifier('traceFunction'))],
        t.stringLiteral('../tracing/trace-function')
      );
      path.findParent((p) => p.isProgram()).unshiftContainer('body', importDeclaration);
      state.importAdded = true;
    }

    if (path.isFunctionDeclaration()) {
      const variableDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(functionName), wrappedFunction),
      ]);
      path.replaceWith(variableDeclaration);
    } else {
      path.node.init = wrappedFunction;
    }
  }
};

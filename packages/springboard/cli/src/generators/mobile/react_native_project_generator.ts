export const generateReactNativeProject = async () => {
    const packageJSON = await import('../../../../platform-examples/react-native/package.json');
    console.log(packageJSON);
};

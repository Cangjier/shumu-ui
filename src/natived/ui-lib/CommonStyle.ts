import { InjectClass, InjectStyle } from "../lib/InjectStyle";


const blinkingSvgClass = InjectClass(`animation: blink 1.5s linear infinite;`, {
    keyframes: {
        blink: `
        0%, 100% { opacity: 1; }  
        50% { opacity: 0; }  
        `
    }
});

const rotatingSvgClass = InjectClass(`animation: rotate 1.5s linear infinite;`, {
    keyframes: {
        rotate: `
        0% { transform: rotate(0deg); }  
        100% { transform: rotate(360deg); }  
        `
    }
});

export { blinkingSvgClass, rotatingSvgClass }
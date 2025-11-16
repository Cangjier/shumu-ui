import { forwardRef, useEffect, useState } from "react"
import { InjectClass } from "../lib/InjectStyle"


export interface IFullParentProps {
    style?: React.CSSProperties,
    visible?: boolean,
    children?: React.ReactNode
}

export interface IFullParentRef {
}

const CoverClass = InjectClass(`
    position: absolute;  /* 绝对定位，相对于其最近的定位祖先元素（这里是.container） */  
    top: 0;  
    left: 0;  
    right: 0;  
    bottom: 0;  /* 这四个属性使蒙布覆盖整个容器 */  
    background-color: rgba(0, 0, 0, 0);  /* 黑色背景，50%的透明度 */  
    z-index: 999;  /* 确保蒙布在内容之下 */
`, {
    // before: `
    // content: "";  /* 伪元素需要内容，但我们不需要显示任何内容，所以使用空字符串 */  
    // position: absolute;  /* 绝对定位，相对于其最近的定位祖先元素（这里是.container） */  
    // top: 0;  
    // left: 0;  
    // right: 0;  
    // bottom: 0;  /* 这四个属性使蒙布覆盖整个容器 */  
    // background-color: rgba(0, 0, 0, 1);  /* 黑色背景，50%的透明度 */  
    // z-index: 999;  /* 确保蒙布在内容之下 */
    // `
})

export const FullParent = forwardRef<IFullParentRef, IFullParentProps>((props, ref) => {
    const [style, setStyle] = useState<React.CSSProperties>(props.style || {})
    const [visible, setVisible] = useState<boolean>(props.visible || false)
    useEffect(() => {
        setStyle(props.style || {})
    }, [props.style])
    useEffect(() => {
        setVisible(props.visible || false)
    }, [props.visible])
    return <div style={{
        display: visible ?? true ? 'flex' : "none", ...style,
        alignItems: 'center',
        justifyContent: 'center'
    }} className={CoverClass}>
        {props.children}
    </div>
})
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { InjectClass, InjectStyle } from "../..";


const resizeBarClass = InjectClass(`
width: 10px;
cursor: ew-resize;
background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0) 0%,     /* 左侧完全透明 */
    rgba(0, 0, 0, 0) 40%,    /* 左侧透明占 20% */
    rgba(0, 0, 0, 0.3) 40%,  /* 中间区域为灰色，透明度为 0.3 */
    rgba(0, 0, 0, 0.3) 60%,  /* 中间区域灰色持续到 80% */
    rgba(0, 0, 0, 0) 60%,    /* 右侧透明占 20% */
    rgba(0, 0, 0, 0) 100%    /* 右侧完全透明 */
);
`);
export interface IResizeButtonProps {
    onDeltaChange?: (width: number) => void,
    style?:React.CSSProperties
}

export interface IResizeButtonRef {
}

export const ResizeButton = forwardRef<IResizeButtonRef, IResizeButtonProps>((props, ref) => {
    const [delta, setDelta] = useState(0); // 初始左侧宽度
    const separatorRef = useRef(null); // 引用分隔条
    const sumDelta = useRef(0); // 存储拖动前的总宽度

    // 存储拖动状态
    const [isDragging, setIsDragging] = useState(false);
    const [startOffset, setStartOffset] = useState(0); // 初始鼠标位置
    const handleMouseDown = (e: any) => {
        setStartOffset(e.clientX);
        setIsDragging(true);
    };

    const handleMouseMove = (e: any) => {
        if (isDragging) {
            setDelta(e.clientX - startOffset);
        }
    };

    const handleMouseUp = (e: any) => {
        setIsDragging(false);
        sumDelta.current += e.clientX - startOffset;
        setDelta(0);
    };

    // 在组件挂载和卸载时添加/移除事件监听
    useEffect(() => {
        if (isDragging) {
            // 监听鼠标移动和释放事件
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);
    useEffect(() => {
        if (props.onDeltaChange && isDragging) {
            props.onDeltaChange(sumDelta.current + delta);
        }
    }, [delta]);
    return <div
        className={resizeBarClass}
        draggable="false"
        ref={separatorRef}
        role="separator"
        onMouseDown={handleMouseDown}
        style={props.style}
    ></div>
});
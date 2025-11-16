import { MouseEventHandler, forwardRef, useEffect, useRef, useState } from "react";
import { InjectClass } from "../lib/InjectStyle";


const fullScreenClass = InjectClass(`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 999; /* Ensure it sits on top of everything else */
`)

const centerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}

export interface IFullScreenProps {
    children?: React.ReactNode,
    style?: React.CSSProperties,
    id?: string,
    center?: boolean,
    open?: boolean,
    onOpenChange?: (open: boolean) => void,
    onClick?: MouseEventHandler<HTMLDivElement> | undefined,
}

export interface IFullScreenRef {
}

const FullScreen = forwardRef<IFullScreenRef, IFullScreenProps>((props, ref) => {
    const [children, setChildren] = useState<React.ReactNode>(props.children)
    const [style, setStyle] = useState<React.CSSProperties>(props.style || {})
    const [id, setId] = useState<string | undefined>(props.id)
    const [center, setCenter] = useState<boolean | undefined>(props.center)
    const [open, setOpen] = useState<boolean | undefined>(props.open)
    const wrapperRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        setChildren(props.children)
    }, [props.children])
    useEffect(() => {
        setStyle(props.style || {})
    }, [props.style])
    useEffect(() => {
        setCenter(props.center)
    }, [props.center])
    useEffect(() => {
        setOpen(props.open)
    }, [props.open])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && wrapperRef.current === event.target as Node) {
                setTimeout(() => {
                    if (props.onOpenChange) {
                        props.onOpenChange(false)
                    }
                    else {
                        setOpen(false)
                    }
                }, 300)
            }
        };

        document.addEventListener('mouseup', handleClickOutside);

        return () => {
            // 清理事件监听器  
            document.removeEventListener('mouseup', handleClickOutside);
        };
    }, []);
    return <div
        ref={wrapperRef}
        id={id}
        style={{
            ...(center ? centerStyle : {}),
            ...(open ? {} : { display: 'none' }),
            ...style
        }}
        className={fullScreenClass}
        onClick={props.onClick}>
        {children}
    </div>
})

export { FullScreen }
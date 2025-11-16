import React, { JSX } from "react"
import { MouseEventHandler, forwardRef, useEffect, useState } from "react"

export interface IFlexProps {
    id?: string,
    className?: string,
    style?: React.CSSProperties,
    children?: React.ReactNode,
    onClick?: MouseEventHandler<HTMLDivElement>,
    verticalCenter?: boolean,
    horizontalCenter?: boolean,
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse',
    onMouseDown?: MouseEventHandler<HTMLDivElement>,
    onMouseMove?: MouseEventHandler<HTMLDivElement>,
    onMouseUp?: MouseEventHandler<HTMLDivElement>,
}

const Flex = forwardRef<HTMLDivElement, IFlexProps>((props, ref) => {
    return <div
        ref={ref}
        id={props.id}
        className={props.className}
        style={{
            display: 'flex',
            flexDirection: props.direction,
            alignItems: props.verticalCenter ? 'center' : undefined,
            justifyContent: props.horizontalCenter ? 'center' : undefined,
            ...props.style
        }}
        onClick={props.onClick}
        onMouseDown={props.onMouseDown}
        onMouseMove={props.onMouseMove}
        onMouseUp={props.onMouseUp}>
        {props.children}
    </div>
})

const Vertical = forwardRef<HTMLDivElement, IFlexProps>((props, ref) => {
    return <Flex ref={ref} {...props} direction='column' />
})

const Horizontal = forwardRef<HTMLDivElement, IFlexProps>((props, ref) => {
    return <Flex ref={ref} {...props} direction='row' />
})

export { Flex, Vertical, Horizontal }
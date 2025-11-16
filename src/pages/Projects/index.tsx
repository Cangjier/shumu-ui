import { forwardRef } from "react";
import { ProjectsApp } from "../../apps/ProjectsApp";

export const Projects = forwardRef<HTMLDivElement, {
    style?: React.CSSProperties;
}>((props, ref) => {
    return <div style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        ...props.style
    }}>
        <ProjectsApp style={{
            padding: "10px",
            borderRadius: "10px",
            width: "calc(60vw - 20px)",
            height: "calc(80vh - 20px)"
        }} />
    </div>
});
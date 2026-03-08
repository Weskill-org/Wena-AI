import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("skeleton-pulse", className)}
            {...props}
        />
    );
}

interface SkeletonContainerProps {
    isLoading: boolean;
    children: React.ReactNode;
    fallback: React.ReactNode;
}

export function SkeletonContainer({ isLoading, children, fallback }: SkeletonContainerProps) {
    if (isLoading) return <>{fallback}</>;
    return <>{children}</>;
}

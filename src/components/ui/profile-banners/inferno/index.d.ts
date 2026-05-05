import * as React from 'react';

export interface InfernoBannerProps extends React.HTMLAttributes<HTMLDivElement> {
    isStatic?: boolean;
}

export declare const InfernoBanner: React.FC<InfernoBannerProps>;

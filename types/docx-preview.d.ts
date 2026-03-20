declare module "docx-preview" {
    export interface RenderOptions {
        className?: string;
        inWrapper?: boolean;
        ignoreWidth?: boolean;
        ignoreHeight?: boolean;
        ignoreFonts?: boolean;
        breakPages?: boolean;
        debug?: boolean;
        experimental?: boolean;
        trimXmlDeclaration?: boolean;
        useBase64URL?: boolean;
        useMathMLPolyfill?: boolean;
        showChanges?: boolean;
        [key: string]: any;
    }

    export function renderAsync(
        data: any,
        bodyContainer: HTMLElement,
        styleContainer?: HTMLElement,
        options?: RenderOptions
    ): Promise<any>;
}

interface Options {
    firstApi: (string | RegExp)[];
    firstCss: (string | RegExp)[];
    firstJs: (string | RegExp)[];
}
export default function (options: Options): Promise<unknown>;
export interface Performance {
    id: string;
    fp: number;
    fcp: number;
    fapi: number | null;
    fjs: number;
    fcss: number;
    fimg: number;
    tti: number;
    fmp: number;
}
export {};
//# sourceMappingURL=index.d.ts.map
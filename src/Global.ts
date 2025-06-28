import { ExtensionContext } from 'vscode';

let ctx: ExtensionContext;

export function setContext(context: ExtensionContext) {
	ctx = context;
}

export function getContext(): ExtensionContext {
	return ctx;
}

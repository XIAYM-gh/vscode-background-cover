import { QuickPickItem, QuickPickItemKind } from 'vscode';
import { OperationType } from './Enums';

export class ListItem implements QuickPickItem {
	label: string;
	description: string;
	operation: OperationType;
	attachment?: string | undefined;
	kind?: QuickPickItemKind | undefined;

	constructor(label: string, description: string, type: OperationType, attachment?: any) {
		this.label = label;
		this.description = description;
		this.operation = type;
		this.attachment = attachment;
	}
}

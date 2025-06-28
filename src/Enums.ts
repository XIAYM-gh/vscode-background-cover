export enum OperationType {
	// General
	NOOP = 0,
	RELOAD_YES = -1,
	RELOAD_NO = -2,

	// Main menu
	SELECT_IMAGE = 1001,
	SET_DIRECTORY = 1002,
	SET_OPACITY = 1003,
	SET_BLUR_STRENGTH = 1004,
	SET_ADAPTATION_MODE = 1005,
	SET_FROM_URL = 1006,
	DISABLE_IMAGE = 1007,
	ENABLE_AUTO_REPLACEMENT = 1008,
	DISABLE_AUTO_REPLACEMENT = 1009,

	// Select image menu
	IMAGE_MANUAL_SELECTION = 2001,
	IMAGE_RANDOM_SELECTION = 2002,
	HANDLE_SELECT_IMAGE = 2003,

	// Image size adaptation menu
	HANDLE_ADAPTATION_MODE = 3001
}

export enum ImageFileType {
	UNASSIGNED = 0,
	LOCAL = 1, // seems unused
	HTTPS = 2
}

export enum FilePickerType {
	FILE = 1,
	FOLDER = 2
}

export enum InputBoxType {
	IMAGE_FROM_URL = 0,
	SET_OPACITY = 1,
	SET_BLUR_STRENGTH = 2
}

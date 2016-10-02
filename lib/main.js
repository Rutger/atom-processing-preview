'use babel';

import url from 'url';

let ProcessingPreviewView = null;

function createProcessingPreviewView(state) {
	if (ProcessingPreviewView == null) {
		ProcessingPreviewView = require('./processing-preview-view');
	}
	return new ProcessingPreviewView(state);
}

function isProcessingPreviewView(object) {
	if (ProcessingPreviewView == null) {
		ProcessingPreviewView = require('./processing-preview-view');
	}
	return object instanceof ProcessingPreviewView;
}

atom.deserializers.add({
	name: 'ProcessingPreviewView',
	deserialize(state) {
		if (state.constructor === Object) {
			return createProcessingPreviewView(state);
		}
	},
});

module.exports = {
	config: require('./config'),
	activate() {
		atom.commands.add('atom-workspace', {
			'processing-preview:toggle': () => this.toggle(),
		});

		atom.workspace.addOpener((uriToOpen) => this.onOpenUri(uriToOpen));
	},
	toggle() {
		if (isProcessingPreviewView(atom.workspace.getActivePaneItem())) {
			atom.workspace.destroyActivePaneItem();
			return;
		}

		const editor = atom.workspace.getActiveTextEditor();
		if (editor == null) return;

		const grammars = atom.config.get('processing-preview.grammars') || [];

		if (
			grammars.indexOf(editor.getGrammar().scopeName) >= 0 &&
			!this.removePreviewForEditor(editor)
		) {
			return this.addPreviewForEditor(editor);
		}
	},
	addPreviewForEditor(editor) {
		const uri = this.uriForEditor(editor);
		const previousActivePane = atom.workspace.getActivePane();
		const options = {
			searchAllPanes: true,
			activatePane: false,
			split: atom.config.get('processing-preview.openPreviewInSplitPane') ? 'right' : undefined,
		};

		atom.workspace.open(uri, options).then((processingPreviewView) => {
			if (isProcessingPreviewView(processingPreviewView)) {
				previousActivePane.activate();
			}
		});
	},
	removePreviewForEditor(editor) {
		const uri = this.uriForEditor(editor);
		const previewPane = atom.workspace.paneForURI(uri);

		if (previewPane) {
			previewPane.destroyItem(previewPane.itemForURI(uri));
			return true;
		}

		return false;
	},
	onOpenUri(uriToOpen) {
		let protocol;
		let host;
		let filePath;

		try {
			const urlObjs = url.parse(uriToOpen);

			protocol = urlObjs.protocol;
			host = urlObjs.host;
			filePath = urlObjs.pathname;

			if (protocol !== 'processing-preview:') return;

			if (filePath) {
				filePath = decodeURI(filePath);
			}
		} catch (error) {
			return;
		}

		if (host === 'editor') {
			return createProcessingPreviewView({ editorId: filePath.substring(1) });
		}

		return createProcessingPreviewView({ filePath });
	},
	uriForEditor(editor) {
		return `processing-preview://editor/${editor.id}`;
	},
};

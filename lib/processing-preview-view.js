'use babel';

import { View, $ } from 'atom-space-pen-views';
import { Emitter, Disposable, CompositeDisposable } from 'atom';
import path from 'path';
import Processing from './processing';
import { allowUnsafeNewFunction, allowUnsafeEval } from 'loophole';

class ProcessingPreviewView extends View {
	static deserialize(state) {
		return new ProcessingPreviewView(state);
	}
	static content() {
		this.div({
			outlet: 'container',
			class: 'processing-preview',
			tabindex: -1,
		}, () => {
			this.canvas({ outlet: 'canvas' });
		});
	}
	constructor({ editorId, filePath }) {
		super();

		this.editorId = editorId;
		this.filePath = filePath;

		this.emitter = new Emitter;
		this.disposables = new CompositeDisposable;
	}
	attached() {
		if (this.isAttached) return;
		this.isAttached = true;

		if (this.editorId) {
			this.resolveEditor(this.editorId);
		} else if (this.filePath) {
			if (atom.workspace) {
				this.subscribeToFilePath(this.filePath);
			} else {
				this.disposables.add(atom.packages.onDidActivateInitialPackages(() =>
					this.subscribeToFilePath(this.filePath)
				));
			}
		}
	}
	getTitle() {
		let title = 'Processing';
		if (this.file) {
			title = path.basename(this.getPath());
		} else if (this.editor) {
			title = this.editor.getTitle();
		}
		return `${title} Preview`;
	}
	getPath() {
		if (this.file) {
			return this.file.getPath();
		} else if (this.editor) {
			return this.editor.getPath();
		}
	}
	subscribeToFilePath(filePath) {
		this.file = new File(filePath);
		this.emitter.emit('did-change-title');
		this.handleEvents();
		this.renderProcessing();
	}
	handleEvents() {
		if (this.file) {
			this.disposables.add(
				this.file.onDidChange(() => this.changeHandler())
			);
		} else if (this.editor) {
			const buffer = this.editor.getBuffer();

			this.disposables.add(
				buffer.onDidSave(() => this.changeHandler(false)),
				buffer.onDidReload(() => this.changeHandler(false)),
				buffer.onDidStopChanging(() => this.changeHandler(true)),
				this.editor.onDidChangePath(() => this.emitter.emit('did-change-title'))
			);
		}
	}
	resolveEditor(editorId) {
		this.editor = this.editorForId(editorId);

		if (this.editor) {
			this.emitter.emit('did-change-title');
			this.handleEvents();
			this.renderProcessing();
		} else {
			// The editor this preview was created for has been closed so close
			// this preview since a preview cannot be rendered without an editor
			const paneView = this.parents('.pane').view();
			if (paneView) {
				paneView.destroyItem(this);
			}
		}
	}
	onDidChangeModified(callback) {
		// No op to suppress deprecation warning
		return new Disposable;
	}
	editorForId(editorId) {
		for (let editor of atom.workspace.getTextEditors()) {
			if (editor.id && editor.id.toString() === editorId.toString()) {
				return editor;
			}
		}
	}
	onDidChangeTitle(callback) {
		return this.emitter.on('did-change-title', callback);
	}
	renderProcessing() {
		return this.getProcessingSource()
			.then((source) => this.renderProcessingText(source));
	}
	getProcessingSource() {
		if (this.file) {
			return this.file.read();
		} else if (this.editor) {
			return Promise.resolve(this.editor.getText());
		} else {
			return Promise.resolve(null);
		}
	}
	config(key) {
		return atom.config.get(`processing-preview.${key}`);
	}
	changeHandler(ifLiveUpdate = null) {
		if (ifLiveUpdate === !this.config('liveUpdate')) {
			return;
		}

		this.renderSketch();

		const pane = atom.workspace.paneForItem(this);
		if (pane && pane !== atom.workspace.getActivePane()) {
			pane.activateItem(this);
		}
	}
	renderSketch() {
		return this.getProcessingSource()
			.then((source) => this.renderProcessingText(source));
	}
	renderProcessingText(processingCode) {
		if (!processingCode) return;

		const jsCode = Processing.compile(processingCode).sourceCode;

		if (this.sketch) {
			this.sketch.exit();
		}

		allowUnsafeNewFunction(() => {
			allowUnsafeEval(() => {
				this.sketch = new Processing(this.canvas.context, eval(jsCode));
			});
		});

		this.emitter.emit('did-change-file');
		this.originalTrigger('processing-preview:file-changed');
	}
	onDidChangeFile(callback) {
		return this.emitter.on('did-change-file', callback);
	}
}

module.exports = ProcessingPreviewView;

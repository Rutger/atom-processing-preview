'use babel';

import { View } from 'atom-space-pen-views';
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
	serialize() {
		return {
			deserializer: 'ProcessingPreviewView',
			filePath: this.getPath(),
			editorId: this.editorId,
		};
	}
	destroy() {
		this.sketch.exit();
		this.disposables.dispose();
	}
	onDidChangeTitle(callback) {
		return this.emitter.on('did-change-title', callback);
	}
	onDidChangeModified() {
		// No op to suppress deprecation warning
		return new Disposable;
	}
	onDidChangeFile(callback) {
		return this.emitter.on('did-change-file', callback);
	}
	subscribeToFilePath(filePath) {
		this.file = new File(filePath);
		this.emitter.emit('did-change-title');
		this.handleEvents();
		this.renderSketch();
	}
	resolveEditor(editorId) {
		const resolve = () => {
			this.editor = this.editorForId(editorId);

			if (this.editor) {
				this.emitter.emit('did-change-title');
				this.handleEvents();
				this.renderSketch();
			} else {
				// The editor this preview was created for has been closed so close
				// this preview since a preview cannot be rendered without an editor
				const paneView = this.parents('.pane').view();
				if (paneView) {
					paneView.destroyItem(this);
				}
			}
		};

		if (atom.workspace) {
			resolve();
		} else {
			this.disposables.add(atom.packages.onDidActivateInitialPackages(resolve));
		}
	}
	editorForId(editorId) {
		for (let editor of atom.workspace.getTextEditors()) {
			if (editor.id && editor.id.toString() === editorId.toString()) {
				return editor;
			}
		}
	}
	config(key) {
		return atom.config.get(`processing-preview.${key}`);
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
		return this.getSketchSource()
			.then((source) => this.renderSketchCode(source));
	}
	renderSketchCode(sketchSource) {
		if (!sketchSource) return;

		const sketchCompiled = Processing.compile(sketchSource).sourceCode;

		if (this.sketch) {
			this.sketch.exit();
		}

		allowUnsafeNewFunction(() => {
			allowUnsafeEval(() => {
				this.sketch = new Processing(this.canvas.context, eval(sketchCompiled));
			});
		});

		this.emitter.emit('did-change-file');
		this.originalTrigger('processing-preview:file-changed');
	}
	getSketchSource() {
		if (this.file) {
			return this.file.read();
		} else if (this.editor) {
			return Promise.resolve(this.editor.getText());
		} else {
			return Promise.resolve(null);
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
	getURI() {
		if (this.file) {
			return `processing-preview://${this.getPath()}`;
		}
		return `processing-preview://editor/${this.editorId}`;
	}
}

atom.deserializers.add(ProcessingPreviewView);

module.exports = ProcessingPreviewView;

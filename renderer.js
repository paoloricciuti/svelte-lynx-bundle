import { createCustomRenderer } from 'svelte/renderer';

let pageId;

const event_reg_xp =
	/^(bind|catch|capture-bind|capture-catch|global-bind)([A-Za-z]+)$/;
const event_type_map = {
	bind: 'bindEvent',
	catch: 'catchEvent',
	'capture-bind': 'capture-bind',
	'capture-catch': 'capture-catch',
	'global-bind': 'global-bindEvent',
};

const parents = new WeakMap();

export function set_page_id(id) {
	pageId = id;
}

function log_fragment_or_element(el) {
	if (el?.kind === 'fragment') {
		return {
			kind: 'fragment',
			children: (el.children ?? []).map(log_fragment_or_element),
		};
	}
	return __GetTag(el);
}

export default createCustomRenderer({
	createFragment() {
		return {
			kind: 'fragment',
		};
	},
	setAttribute(element, key, value) {
		if (key === 'style') {
			__SetInlineStyles(element, value);
		} else if (key === 'class') {
			__SetClasses(element, value);
		} else if (key.startsWith('data-')) {
			__AddDataset(element, key.slice(5), value);
		} else {
			__SetAttribute(element, key, value);
		}
		__FlushElementTree(element);
	},
	createElement(name) {
		console.log('createElement', name);
		return __CreateElement(name, pageId);
	},
	createTextNode(data) {
		return __CreateRawText(data);
	},
	setText(node, text) {
		__SetAttribute(node, 'text', text);
		__FlushElementTree(node);
	},
	createComment() {
		return __CreateRawText('');
		return __CreateElement('text', pageId);
	},
	getFirstChild(element) {
		if (element.kind === 'fragment') {
			return element.children?.[0];
		}
		return __FirstElement(element);
	},
	getNextSibling(element) {
		const parent = parents.get(element);
		if (parent && 'kind' in parent && parent.kind === 'fragment') {
			const idx = parent.children.findIndex((el) => el === element);
			return parent.children[idx + 1];
		}
		const sibling = __NextElement(element);
		return sibling;
	},
	insert(parent, element, anchor) {
		if (parent?.kind === 'fragment') {
			if (parent.children == null) {
				parent.children = [];
			}
			if (element.kind === 'fragment') {
				for (let child of element.children) {
					const idx = parent.children.findIndex(
						(el) => el === anchor
					);
					parent.children.splice(
						idx !== -1 ? idx : parent.children.length,
						0,
						child
					);
					parents.set(child, parent);
				}
			} else {
				const idx = parent.children.findIndex((el) => el === anchor);
				parent.children.splice(
					idx !== -1 ? idx : parent.children.length,
					0,
					element
				);
				parents.set(element, parent);
			}
		} else {
			for (let child of element.children ?? [element]) {
				__InsertElementBefore(parent, child, anchor);
				parents.set(child, parent);
			}
			__FlushElementTree(parent);
		}
	},
	remove(node) {
		if (!node) return;
		const parent = parents.get(node);
		if (parent.kind === 'fragment') {
			parent.children = parent.children.filter((el) => el !== node);
		} else {
			__RemoveElement(parent, node);
			__FlushElementTree(parent);
		}
	},
	getParent(element) {
		return parents.get(element) ?? __GetParent(element);
	},
	cloneNode(node) {
		return node;
	},
	addEventListener(element, event_name, handler) {
		let match = event_name.match(event_reg_xp);
		const event = event_type_map[match[1]];
		const name = match[2];
		__AddEvent(element, event, name, {
			type: 'worklet',
			value: handler,
		});
	},
});

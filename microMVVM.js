/**
 * 
 * Observer
 *  
 */

function observe(data) {
    if (!data || typeof data !== 'object') {
        return;
    }
    Object.keys(data).forEach(function (key) {
        defineObserver(data, key, data[key]);
    });
}

function defineObserver(data, key, val) {
    // 如果是对象，则为子属性添加观察器
    observe(val);
    let dep = new Dep();
    Object.defineProperty(data, key, {
        enumerable: true,
        configurable: false,
        get() {
            if (Dep.target) {
                dep.addWatcher(Dep.target);
            }
            return val;
        },
        set(newVal) {
            // 数据不变
            if (val === newVal) {
                return;
            }
            // 如果数据更改了
            val = newVal;
            // 让Dep去通知watcher
            dep.notify();
        }
    });
}

class Dep {
    constructor() {
        this.deps = [];
    }
    addWatcher(watcher) {
        this.deps.push(watcher);
    }
    notify() {
        this.deps.forEach(function (watcher) {
            watcher.update();
        });
    }
}

Dep.target = null;

/**
 *  Watcher
 * 
 */

class Watcher {
    constructor(vm, exp, callback) {
        this.vm = vm;
        this.exp = exp;
        this.callback = callback;
        this.value = this.get();
    }
    update() {
        let oldVal = this.value;
        let newVal = this.vm.data[this.exp];
        if (oldVal === newVal) {
            return;
        }
        this.value = newVal;
        // 更新视图
        this.callback.call(this.vm, newVal);
    }
    get() {
        Dep.target = this;
        // 这里就触发了Observer的getter
        let value = this.vm.data[this.exp];
        Dep.target = null;
        return value;
    }
}

/**
 *  Compiler
 * 
 */

class Compiler {
    constructor(elem,vm) {
        this.elem = this.isElementNode(elem) ? elem : document.querySelector(elem);
        this.vm = vm;
        if (this.elem) {
            this.frag = this.toFragment(this.elem);
            this.init();
            this.elem.appendChild(this.frag);
        } else {
            throw new Error('no elem');
        }
    }
    init() {
        this.compileElement(this.frag);
    }
    toFragment(node) {
        let frag = document.createDocumentFragment();
        let child;
        while (child = node.firstChild) {
            frag.appendChild(child);
        }
        return frag;
    }
    compileElement(node) {
        let childs = node.childNodes;

        childs = [].slice.call(childs);

        childs.forEach((child) => {

            let regx = /\{\{(.*)\}\}/,
                text = child.textContent;

            if (this.isElementNode(child)) {
                this.compile(child);
            } else if (this.isTextNode(child) && regx.test(text)) {
                this.compileText(child, regx.exec(text)[1]);
            }

            if (child.childNodes && child.childNodes.length !== 0) {
                // 继续遍历子节点 
                this.compileElement(child);
            }
        });

    }
    compile(node) {
        // 获取节点属性
        let attrs = node.attributes;

        [].slice.call(attrs).forEach((attr) => {

            if(this.isModelDirective(attr.name)){

                // v-model
                let tagName = node.tagName.toLowerCase();

                if(tagName === 'input' || tagName === 'textarea') {

                    let exp = attr.value; 

                    node.value = this.vm.data[exp];

                    new Watcher(this.vm,exp,function(newVal) {
                        node.value = newVal ? newVal : '';
                    });

                    node.addEventListener('input',(e) => {
                        this.vm.data[exp] = e.target.value;
                    });

                }


            } else if (this.isEventDirective(attr.name)) {

                // v-on
                let eventName = attr.name.split(':')[1],
                    eventHandler = this.vm.methods[attr.value];

                if(eventHandler) {

                    node.addEventListener(eventName,eventHandler.bind(this.vm),false);

                }

            } else if (this.isDirective(attr.name)) {

                // v-text

                let exp = attr.value;

                node.innerHTML = this.vm.data[exp];

                new Watcher(this.vm, exp, function (newVal) {
                    node.innerHTML = newVal ? newVal : '';
                });

            }

        });

    }
    compileText(node, exp) {
        let innerText = this.vm.data[exp];

        node.textContent = innerText;

        new Watcher(this.vm, exp, function (newVal) {
            node.textContent = newVal ? newVal : '';
        });
    }
    isElementNode(node) {
        return node.nodeType === 1;
    }
    isTextNode(node) {
        return node.nodeType === 3;
    }
    isModelDirective(val) {
        return val === 'v-model'
    }
    isEventDirective(val) {
        return val.indexOf(':') !== -1;
    }
    isDirective(val) {
        return val === 'v-text';
    }
}

/**
 *  micro-MVVM
 * 
 */

class MVVM {
    constructor(vm) {
        this.data = vm.data,
        this.elem = vm.elem;
        this.methods = vm.methods;
    
        Object.keys(this.data).forEach(key => {
            this._proxyKey(key);
        });
    
        observe(this.data);
    
        new Compiler(this.elem, this); // 必须把this传进去
    
        vm.mounted.call(this);
    }
    _proxyKey(key) {
        Object.defineProperty(this, key, {
            configurable: true,
            enumerable: false,
            get() {
                return this.data[key];
            },
            set(val) {
                this.data[key] = val;
            }
        });
    }
}
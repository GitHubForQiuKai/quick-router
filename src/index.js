import { match } from "path-to-regexp"

let _Vue

class QuickRouter {

    constructor(options) {
        this.options = options
        this.routesMap = Object.create(null) // 路由配置map
        this.loadRoutes() // 加载路由配置
        this.route = Object.create(null) // 当前route
        this.depth = 0 // 记录router-view层级深度
        this.listen() // 监听路由改变事件
        this.path = this.getPath() || '/' // 浏览器的有效path

        this.createRoute()// 需主动调用一次，因为此时的listen已失效，获取route
    }


    // 加载routes，并将转换为map
    loadRoutes() {
        const routes = this.options.routes
        routes.forEach(route => {
            const path = route.path
            this.routesMap[path] = route
            this._recRoutes(route, path, 0)
        })
    }

    // 递归加载route
    _recRoutes(route, path = '') {
        if (!route.children || !route.children.length) {
            return
        }

        const routes = route.children
        routes.forEach(item => {
            item.parent = route // 记录父级，为以后view做层级渲染
            const fullPath = path + '/' + item.path
            this.routesMap[fullPath] = item
            this._recRoutes(item, fullPath)
        })
    }

    // 监听路由改变事件
    listen() {
        const eventType = this.options.mode === 'history' ? 'popstate' : 'hashchange'
        window.addEventListener(eventType, this.handleRoutingEvent.bind(this))
        window.addEventListener('load', this.handleRoutingEvent.bind(this))
    }

    // 事件处理句柄
    handleRoutingEvent() {
        this.depth = 0 // 重置depth
        this.createRoute()// 解析path
    }

    /**
     * 获取path
     * todo 这里的获取path还不全面，query后面的参数未获取
     */
    getPath() {
        const mode = this.options.mode
        if (mode === 'hash') {
            // 这里通过window.localtion.hash来获取并不准确，会有浏览器兼容性问题
            // 更好的做法是通过window.localtion.href来手动截取
            return '/' + window.localtion.hash
        }

        return window.location.pathname
    }

    /**
     * 解析path为route对象
     */
    createRoute() {
        Object.keys(this.routesMap).forEach(path => {
            if (path) {
                const matched = match(path)(this.path);
                if (matched) {
                    this.route = matched
                    this.route.realPath = path
                    this.route.matched = this._collectMatcted(this.routesMap[path])
                }
            }
        })
    }

    /**
     * 收集matched记录，包括父级
     */
    _collectMatcted(record) {
        const ret = []

        while (record) {
            // 从父->子的顺序放置
            ret.unshift(record)
            record = record.parent
        }
        return ret

    }
}

QuickRouter.install = function (Vue) {
    // 防止多次install
    if (QuickRouter.installed) return

    QuickRouter.installed = true

    // 保存外部传入的Vue
    _Vue = Vue

    /**
     * 全局混入beforeCreate方法
     * 延迟挂载$router对象
     * 因为先执行了use(Router)，而这时router对象还未产生
     */
    Vue.mixin({
        beforeCreate() {
            if (this.$options.router) {
                Vue.prototype.$router = this.$options.router
                Vue.prototype.$routerRoot = this.$root
                Vue.prototype.$route = this.$options.router.route

                // 响应式route
                Vue.util.defineReactive(this, 'route', this.$options.router.route)
            }
        }
    })

    // 注册组件
    Vue.component('router-link', {
        functional: true,

        render(h, { props, children }) {
            return h('a',
                {
                    attrs: {
                        href: props.to
                    }
                }, children)
        }
    })
    Vue.component('router-view', {
        functional: true,

        render(h, { parent }) {

            // 函数式组件，通过parent获取$router实例
            const route = parent.$router.route

            /**
             * 通过depth获取当前层级对应的comp。
             * 
             * 官方是通过data.routerView来实现的，
             * 然后每次遍历其parent上的data是否有routerView属性来判断其是否是routerView组件
             * 
             */
            const comp = route.matched[parent.$router.depth]
            if (comp && comp.component) {
                // 每渲染一个routerview，depth++
                parent.$router.depth++
                // 渲染组件
                return h(comp.component)
            }

            return h()
        }
    })
}


export default QuickRouter
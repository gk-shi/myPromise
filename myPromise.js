/**
 * 实现自己的 promise 函数（使用 ES5）
 */


// 定义三个状态常量
var PENDING = 'pending'
var FULFILLED = 'fulfilled'
var REJECTED = 'rejected'



// 定义构造函数
function MyPromise (fn) {
  this.status = PENDING // 初始化状态为 pending
  this.value = undefined // 初始化 value
  this.reason = undefined // 初始化 reason
  // 存放回调函数的数组
  this.onFulfilledCallbacks = []
  this.onRejectedCallbacks = []

  var self = this // 缓存当前 this 指向

  function resolve (value) {
    if (self.status === PENDING) {
      self.status = FULFILLED
      self.value = value
      self.onFulfilledCallbacks.forEach(cb => cb(value))
    }
  }

  function reject (reason) {
    if (self.status === PENDING) {
      self.status = REJECTED
      self.reason = reason
      self.onRejectedCallbacks.forEach(cb => cb(reason))
    }
  }

  try {
    fn(resolve, reject)
  } catch (error) {
    reject(error)
  }
}


// Promise 解析过程
function resolvePromise (promise, x, resolve, reject) {
  // 2.3.1 如果 promise 和 x 引用的是同一个对象，则用 TypeError reject
  if (promise === x) {
    return reject(new TypeError('The promise and the returned result of onResolved or onRejected are the same value.'))
  }
  // 2.3.2 如果 x 是一个 promise ，采用 promise 的状态(这里是指我们自己定义的 promise 类)
  if (x instanceof MyPromise) {
    if (x.status === PENDING) {
      x.then(function (y) {
        resolvePromise(promise, y, resolve, reject)
      }, reject)
    } else if (x.status === FULFILLED) {
      resolve(x.value)
    } else {
      reject(x.reason)
    }
  } else if (typeof x === 'object' || typeof x === 'function') { // 2.3.3 如果 x 是一个对象或者方法
    // x 为 null 时单独考虑
    if (x === null) {
      return resolve(x)
    }

    try {
      // 2.3.3.2 如果取回的x.then属性的结果为一个异常e,用e作为原因reject promise
      var then = x.then
    } catch (error) {
      return reject(error)
    }

    if (typeof then === 'function') {
      // 2.3.3.3 如果then是一个方法，把x当作this来调用它， 第一个参数为 resolvePromise，第二个参数为rejectPromise

      // 2.3.3.3.3 如果resolvePromise和 rejectPromise都被调用，或者对同一个参数进行多次调用，第一次调用执行，任何进一步的调用都被忽略
      var oneHaveBeenCalled = false

      try {
        then.call(x, function (y) {
          // 2.3.3.3.1 如果/当 resolvePromise被一个值y调用，运行 [[Resolve]](promise, y)
          if (oneHaveBeenCalled) return
          oneHaveBeenCalled = true
          resolvePromise(promise, y, resolve, reject)
        }, function (reason) {
          // 2.3.3.3.2 如果/当 rejectPromise被一个原因r调用，用r拒绝（reject）promise
          if (oneHaveBeenCalled) return
          oneHaveBeenCalled = true
          reject(reason)
        })
      } catch (error) {
        // 2.3.3.3.4 如果调用then抛出一个异常e
        // 2.3.3.3.4.1 如果resolvePromise或 rejectPromise已被调用，忽略。
        // 2.3.3.3.4.2 或者， 用e作为reason拒绝（reject）promise
        if (oneHaveBeenCalled) return
        reject(error)
      }
    } else {
      // 2.3.3.4 如果then不是一个函数，用x完成(fulfill)promise
      resolve(x)
    }
  } else { // 2.3.4 如果 x 既不是对象也不是函数，用 x 完成 promise
    resolve(x)
  }
}


// 添加原型方法 then
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  // 2.2.1 如果 onFulfilled， onRejected 不是函数，则忽略操作，返回对应传参
  // 2.2.5 onFulfilled 和 onRejected 必须被当做函数调用，这里不是很明白，但看规范说明，好像是说这两个函数不应该依赖某个环境（举例是说 this 的指向不一）
  var realOnFulfilled = typeof onFulfilled === 'function' ? onFulfilled : function (value) { return value }
  var realOnRejected = typeof onRejected === 'function' ? onRejected : function (reason) { return reason }

  var self = this

  if (this.status === FULFILLED) {
    var promise2 = new MyPromise(function (resolve, reject) {
      setTimeout(function () {
        try {
          if (typeof onFulfilled !== 'function') {
            // 2.2.7.3 如果onFulfilled不是一个方法，并且promise1已经完成（fulfilled）, promise2必须使用与promise1相同的值来完成（fulfiled）
            resolve(self.value)
          } else {
            // 2.2.2 如果onFulfilled是函数
            // 2.2.7.1 如果onFulfilled或onRejected返回一个值x, 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
            var x = realOnFulfilled(self.value)
            resolvePromise(promise2, x, resolve, reject)
          }
        } catch (error) {
          // 2.2.7.2 如果onFulfilled或onRejected抛出一个异常e,promise2 必须被拒绝（rejected）并把e当作原因
          reject(error)
        }
      })
    })

    return promise2
  }

  if (this.status === REJECTED) {
    var promise2 = new MyPromise(function (resolve, reject) {
      setTimeout(function () {
        try {
          if (typeof onRejected !== 'function') {
            // 2.2.7.4 如果onRejected不是一个方法，并且promise1已经被拒绝（rejected）, promise2必须使用与promise1相同的原因来拒绝（rejected）
            reject(self.reason)
          } else {
            // 2.2.3 如果onRejected是函数
            // 2.2.7.1 如果onFulfilled或onRejected返回一个值x, 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
            var x = realOnRejected(self.reason)
            // resolve()
            resolvePromise(promise2, x, resolve, reject)
          }
        } catch (error) {
          reject(error)
        }
      })
    })

    return promise2
  }

  if (this.status === PENDING) {
    var promise2 = new MyPromise(function (resolve, reject) {
      self.onFulfilledCallbacks.push(function () {
        setTimeout(function () {
          try {
            if (typeof onFulfilled !== 'function') {
              resolve(self.value)
            } else {
              // 2.2.7.1 如果onFulfilled或onRejected返回一个值x, 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
              var x = realOnFulfilled(self.value)
              resolvePromise(promise2, x, resolve, reject)
            }
          } catch (error) {
            reject(error)
          }
        })
      })

      self.onRejectedCallbacks.push(function () {
        setTimeout(function () {
          try {
            if (typeof onRejected !== 'function') {
              reject(self.reason)
            } else {
              // 2.2.7.1 如果onFulfilled或onRejected返回一个值x, 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
              var x = realOnRejected(self.reason)
              resolvePromise(promise2, x, resolve, reject)
            }
          } catch (error) {
            reject(error)
          }
        })
      })
    })

    return promise2
  }
}

MyPromise.deferred = function () {
  var result = {}

  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })

  return result
}


module.exports = MyPromise


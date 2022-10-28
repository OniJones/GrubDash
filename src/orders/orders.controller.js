const { stat } = require("fs");
const path = require("path");
// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));
// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// validation middleware

// check if order exists
function orderExists(req, res, next) {
    const { orderId } = req.params;
    const foundOrder = orders.find(order => order.id === orderId)

    if (foundOrder) {
        res.locals.orderId = orderId
        res.locals.order = foundOrder
        return next()
    }
    next({
        status: 404,
        message: `Order does not exist ${orderId}.`
    })
}

// validate dishes is array and its quantity is an integer above 0
function validateDishesArray(req, res, next) {
    const { data: { dishes } = {} } = req.body;
    if (!Array.isArray(dishes) || dishes.length === 0) {
        next({
            status: 400,
            message: `Order must include at least one dish`,
        })
    } else {
        for (let i = 0; i < dishes.length; i++) {
            let dish = dishes[i];
            if (dish.quantity < 1 || typeof(dish.quantity) !== "number" || !dish.quantity) {
                next({
                    status: 400,
                    message: `Dish ${i} must have a quantity that is an integer greater than 0`,
                })
            }
        }
    }
    return next()
}

// validate properties of order
function dataHasProperty(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body
        if (data[propertyName]) {
            return next()
        }
        next({
            status: 400,
            message: `Dish must include ${propertyName}`
        })
    }
}

// validate status for update
function validateUpdateStatus(req, res, next) {
    const { data: { status } } = req.body
    if (status === "pending" || status === "preparing") {
        return next()
    }
    next({
        status: 400,
        message: "The status you attempted to update the order to is invalid, please try again."
    })
}

// validate deletion status 
function validateDeleteStatus(req, res, next) {
    if (res.locals.order.status === "pending") {
        return next()
    }
    next({
        status: 400,
        message: "Cannot delete an order that isn't pending"
    })
}

// validate status of updated order 
function orderNotDelivered(req, res, next) {
    if (res.locals.order.status === "pending" || res.locals.order.status !== "delivered") {
        return next()
    
    } else if (!res.locals.order) {
        next({
            status: 400,
            message: "The current status does not allow for changes to be made"
        })
    } else {
        next({
            status: 400,
            message: "The current status does not allow for changes to be made"
        })
    }
}

// validate id match
function idMatches(req, res, next) {
    const { data = {} } = req.body;
    if (!data.id || res.locals.orderId === data.id) {
        return next()
    }
    next({
        status: 400,
        message: `Order id does not match route id. Order: ${data.id}, Route: ${res.locals.orderId}`,
    })
}


// TODO: Implement the /orders handlers needed to make the tests pass\

//list all orders
function list(req, res, next) {
    const { dishId } = req.params;
    res.json({ data: orders.filter(dishId ? order => order.id : () => true)})
}

// read specific order by id
function read(req, res, next) {
    res.json({ data: res.locals.order })
}

// create new order and add it to the list
function create(req, res, next) {
    const { data: { deliverTo, mobileNumber, status, dishes }} = req.body

    const newOrder = {
        id: nextId(),
        deliverTo,
        mobileNumber,
        status: "pending",
        dishes,
    }
    orders.push(newOrder)
    res.status(201).json({ data: newOrder })
}

// update existing order
function update(req, res, next) {
    const { data: { deliverTo, mobileNumber, status, dishes }} = req.body

    res.locals.order.deliverTo = deliverTo
    res.locals.order.mobileNumber = mobileNumber
    res.locals.order.status = status
    res.locals.order.dishes = dishes

    res.json({ data: res.locals.order })
}

function destroy(req, res, next) {
    const { orderId } = req.params;
    const index = orders.findIndex(order => orderId === order.id)

    if (index > -1) {
        orders.splice(index, 1)
    }
    res.sendStatus(204)
}

module.exports = {
    list,
    read: [orderExists, read],
    create: [
        dataHasProperty("deliverTo"),
        dataHasProperty("mobileNumber"),
        dataHasProperty("dishes"),
        validateDishesArray,
        create
    ],
    update: [
        orderExists,
        orderNotDelivered,
        validateUpdateStatus,
        dataHasProperty("deliverTo"),
        dataHasProperty("mobileNumber"),
        dataHasProperty("dishes"),
        dataHasProperty("status"),
        validateDishesArray,
        idMatches,
        update,
    ],
    destroy: [orderExists, validateDeleteStatus, destroy]
}
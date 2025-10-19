// We'll store clients grouped by restaurantRef
const restaurantClients = new Map(); // Map<restaurantRef, Set<res>>

module.exports = function (app) {
  const addClient = (restaurantRef, res) => {
    if (!restaurantClients.has(restaurantRef)) {
      restaurantClients.set(restaurantRef, new Set());
    }

    restaurantClients.get(restaurantRef).add(res);
    console.log(`👤 Connected owner for restaurant: ${restaurantRef}`);

    // Initial handshake message
    res.write(`data: ${JSON.stringify({ message: "Connected to order stream" })}\n\n`);

    res.on("close", () => {
      restaurantClients.get(restaurantRef).delete(res);
      console.log(`❌ Owner disconnected for restaurant: ${restaurantRef}`);
    });
  };

  // Broadcast update to that specific restaurant
  const broadcastOrderUpdate = (order) => {
    const { restaurantRef } = order;
    const clients = restaurantClients.get(restaurantRef);
    if (!clients) return;

    for (const res of clients) {
      res.write(`data: ${JSON.stringify(order)}\n\n`);
    }
  };

  return {
    addClient,
    broadcastOrderUpdate
  }

}

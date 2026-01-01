const orders = [
  {
    id: crypto.randomUUID(),
    name: "订单 #001",
    customer: "王先生",
    status: "Pending",
    note: "等待确认库存",
    location: { lat: 31.2304, lng: 121.4737 },
  },
  {
    id: crypto.randomUUID(),
    name: "订单 #002",
    customer: "李小姐",
    status: "Delivering",
    note: "预计今日送达",
    location: { lat: 22.5431, lng: 114.0579 },
  },
];

const statusOptions = ["Pending", "Processing", "Delivering", "Complete"];
let activeOrderId = orders[0]?.id ?? null;
let editingOrderId = null;

const ordersContainer = document.getElementById("orders");
const addOrderButton = document.getElementById("addOrder");
const statusFilter = document.getElementById("statusFilter");
const orderDialog = document.getElementById("orderDialog");
const orderForm = document.getElementById("orderForm");
const dialogTitle = document.getElementById("dialogTitle");
const orderName = document.getElementById("orderName");
const orderCustomer = document.getElementById("orderCustomer");
const orderStatus = document.getElementById("orderStatus");
const orderNote = document.getElementById("orderNote");
const cancelDialog = document.getElementById("cancelDialog");
const mapHint = document.getElementById("mapHint");
const clearLocationButton = document.getElementById("clearLocation");

const map = L.map("map").setView([31.2304, 121.4737], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const markers = new Map();
let activeMarker = null;

const createBadge = (status) => `<span class="badge ${status}">${status}</span>`;

const updateMapHint = (message) => {
  mapHint.textContent = message;
};

const ensureMarker = (order) => {
  if (!order.location) {
    return null;
  }
  if (markers.has(order.id)) {
    return markers.get(order.id);
  }
  const marker = L.marker([order.location.lat, order.location.lng], {
    draggable: true,
  }).addTo(map);
  marker.on("dragend", () => {
    const newLatLng = marker.getLatLng();
    order.location = { lat: newLatLng.lat, lng: newLatLng.lng };
    renderOrders();
  });
  markers.set(order.id, marker);
  return marker;
};

const focusOrder = (order) => {
  activeOrderId = order?.id ?? null;
  if (!order) {
    updateMapHint("请选择一个订单以定位。");
    clearLocationButton.disabled = true;
    return;
  }
  if (!order.location) {
    updateMapHint("该订单暂无位置，点击地图可设定配送坐标。");
    clearLocationButton.disabled = true;
    return;
  }
  const marker = ensureMarker(order);
  if (marker) {
    activeMarker = marker;
    map.setView(marker.getLatLng(), 11, { animate: true });
    updateMapHint(
      `已选择：${order.name}（${order.location.lat.toFixed(4)}, ${order.location.lng.toFixed(4)}）`
    );
    clearLocationButton.disabled = false;
  }
};

const renderOrders = () => {
  const filterValue = statusFilter.value;
  ordersContainer.innerHTML = "";
  const filteredOrders = orders.filter((order) =>
    filterValue === "all" ? true : order.status === filterValue
  );

  if (filteredOrders.length === 0) {
    ordersContainer.innerHTML = `<div class="order"><p>没有符合条件的订单。</p></div>`;
    return;
  }

  filteredOrders.forEach((order) => {
    const wrapper = document.createElement("div");
    wrapper.className = `order${order.id === activeOrderId ? " active" : ""}`;

    wrapper.innerHTML = `
      <div>
        <h3>${order.name}</h3>
        <p>客户：${order.customer}</p>
      </div>
      <div class="meta">
        ${createBadge(order.status)}
        <span>备注：${order.note ? order.note : "-"}</span>
      </div>
      <div class="meta">
        <span>${
          order.location
            ? `位置：${order.location.lat.toFixed(3)}, ${order.location.lng.toFixed(3)}`
            : "位置：未设置"
        }</span>
      </div>
      <div class="order-actions">
        <button data-action="select" data-id="${order.id}">定位</button>
        <button data-action="edit" data-id="${order.id}">编辑</button>
        <button data-action="status" data-id="${order.id}">状态切换</button>
        <button data-action="delete" data-id="${order.id}">删除</button>
      </div>
    `;

    ordersContainer.appendChild(wrapper);
  });
};

const openDialog = (mode, order = null) => {
  if (mode === "edit" && order) {
    dialogTitle.textContent = "编辑订单";
    orderName.value = order.name;
    orderCustomer.value = order.customer;
    orderStatus.value = order.status;
    orderNote.value = order.note ?? "";
    editingOrderId = order.id;
  } else {
    dialogTitle.textContent = "新增订单";
    orderName.value = "";
    orderCustomer.value = "";
    orderStatus.value = "Pending";
    orderNote.value = "";
    editingOrderId = null;
  }
  orderDialog.showModal();
};

const closeDialog = () => {
  orderDialog.close();
  editingOrderId = null;
};

const updateStatus = (order) => {
  const currentIndex = statusOptions.indexOf(order.status);
  const nextIndex = (currentIndex + 1) % statusOptions.length;
  order.status = statusOptions[nextIndex];
};

const removeOrder = (orderId) => {
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) return;
  orders.splice(index, 1);
  const marker = markers.get(orderId);
  if (marker) {
    map.removeLayer(marker);
    markers.delete(orderId);
  }
  if (activeOrderId === orderId) {
    activeOrderId = orders[0]?.id ?? null;
  }
};

ordersContainer.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.action;
  const orderId = target.dataset.id;
  const order = orders.find((item) => item.id === orderId);
  if (!order) return;

  if (action === "select") {
    focusOrder(order);
  }
  if (action === "edit") {
    openDialog("edit", order);
  }
  if (action === "status") {
    updateStatus(order);
    renderOrders();
    focusOrder(order);
  }
  if (action === "delete") {
    removeOrder(order.id);
    renderOrders();
    focusOrder(orders.find((item) => item.id === activeOrderId));
  }
});

statusFilter.addEventListener("change", renderOrders);

addOrderButton.addEventListener("click", () => {
  openDialog("add");
});

cancelDialog.addEventListener("click", closeDialog);

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = {
    name: orderName.value.trim(),
    customer: orderCustomer.value.trim(),
    status: orderStatus.value,
    note: orderNote.value.trim(),
  };

  if (!payload.name || !payload.customer) {
    return;
  }

  if (editingOrderId) {
    const order = orders.find((item) => item.id === editingOrderId);
    if (order) {
      order.name = payload.name;
      order.customer = payload.customer;
      order.status = payload.status;
      order.note = payload.note;
    }
  } else {
    orders.unshift({
      id: crypto.randomUUID(),
      location: null,
      ...payload,
    });
    activeOrderId = orders[0].id;
  }

  renderOrders();
  focusOrder(orders.find((item) => item.id === activeOrderId));
  closeDialog();
});

map.on("click", (event) => {
  const order = orders.find((item) => item.id === activeOrderId);
  if (!order) return;
  order.location = { lat: event.latlng.lat, lng: event.latlng.lng };
  const marker = ensureMarker(order);
  if (marker) {
    marker.setLatLng(event.latlng);
  }
  renderOrders();
  focusOrder(order);
});

clearLocationButton.addEventListener("click", () => {
  const order = orders.find((item) => item.id === activeOrderId);
  if (!order) return;
  order.location = null;
  const marker = markers.get(order.id);
  if (marker) {
    map.removeLayer(marker);
    markers.delete(order.id);
  }
  renderOrders();
  focusOrder(order);
});

renderOrders();
focusOrder(orders.find((item) => item.id === activeOrderId));

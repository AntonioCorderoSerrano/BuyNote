import React from 'react';
import { useState, useEffect, useRef, useCallback } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, writeBatch, getDocs, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function ShoppingList() {
  const [items, setItems] = useState([]);
  const [lists, setLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [currentList, setCurrentList] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmListDelete, setConfirmListDelete] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [emailToShare, setEmailToShare] = useState("");
  const [sharedUsers, setSharedUsers] = useState([]);
  const [unshareDialogOpen, setUnshareDialogOpen] = useState(false);
  const [userToUnshare, setUserToUnshare] = useState("");
  const [userReady, setUserReady] = useState(false);
  const [emailValidation, setEmailValidation] = useState({ valid: true, message: "" });
  const [listObservations, setListObservations] = useState({});
  const [itemPrices, setItemPrices] = useState({});
  const [purchaseInfo, setPurchaseInfo] = useState({});
  const [extraInfo, setExtraInfo] = useState({});
  const [observationsDialogOpen, setObservationsDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [editingObservations, setEditingObservations] = useState(false);

  const allLists = [...lists, ...sharedLists];
  const itemsCache = useRef({});
  const listsCache = useRef({ userLists: [], sharedLists: [] });

  // Categorías mejoradas con íconos y colores
  const CATEGORIES = {
    "FRUITS_VEGETABLES": {
      name: "Frutas y Verduras",
      icon: "🍎",
      color: "#4CAF50",
      keywords: ["manzana", "plátano", "naranja", "pera", "kiwi", "melón", "sandía", "piña", "fresa", "mango", "lechuga", "tomate", "zanahoria", "cebolla", "pimiento", "espinaca", "brócoli", "coliflor", "ajo", "pepino", "calabacín", "berenjena", "aguacate"]
    },
    "MEAT": {
      name: "Carnes",
      icon: "🍖",
      color: "#F44336",
      keywords: ["pollo", "ternera", "cerdo", "pavo", "cordero", "chuleta", "filete", "salchicha", "jamón", "bacon", "costilla", "albóndigas", "chorizo", "morcilla", "lomo", "hamburguesa"]
    },
    "DAIRY": {
      name: "Lácteos",
      icon: "🥛",
      color: "#FFEB3B",
      keywords: ["leche", "queso", "yogur", "mantequilla", "nata", "crema", "queso crema", "leche condensada", "leche evaporada", "requesón", "kefir", "batido de leche"]
    },
    "BAKERY": {
      name: "Panadería",
      icon: "🥖",
      color: "#8D6E63",
      keywords: ["pan", "bollo", "baguette", "tostada", "croissant", "galleta", "magdalena", "bizcocho", "donut", "empanada", "pan integral", "pan de molde"]
    },
    "CLEANING": {
      name: "Limpieza",
      icon: "🧼",
      color: "#2196F3",
      keywords: ["jabón", "detergente", "limpiador", "lejía", "esponja", "papel higiénico", "limpiacristales", "lavavajillas", "suavizante", "desinfectante", "guantes", "fregasuelos"]
    },
    "BEVERAGES": {
      name: "Bebidas",
      icon: "🥤",
      color: "#03A9F4",
      keywords: ["agua", "refresco", "zumo", "jugo", "cerveza", "vino", "café", "té", "bebida energética", "batido", "licor", "kombucha", "agua con gas", "horchata", "infusión"]
    },
    "FROZEN": {
      name: "Congelados",
      icon: "❄️",
      color: "#00BCD4",
      keywords: ["helado", "pizza", "verduras congeladas", "pescado congelado", "croquetas", "nuggets", "empanadillas", "lasaña congelada", "tarta helada", "pan congelado"]
    },
    "SNACKS": {
      name: "Snacks",
      icon: "🍿",
      color: "#FF9800",
      keywords: ["patatas fritas", "gusanitos", "palomitas", "barritas energéticas", "galletas saladas", "chocolate", "caramelos", "chicles", "turrón", "bombones", "frutos secos"]
    },
    "CANNED": {
      name: "Conservas",
      icon: "🥫",
      color: "#795548",
      keywords: ["atún en lata", "maíz en lata", "sardinas", "tomate triturado", "alubias en conserva", "garbanzos en lata", "pimientos asados", "olivas", "fruta en almíbar", "paté"]
    },
    "GRAINS_PASTA": {
      name: "Granos y Pastas",
      icon: "🍝",
      color: "#CDDC39",
      keywords: ["arroz", "pasta", "espaguetis", "macarrones", "quinoa", "cuscús", "harina", "sémola", "copos de avena", "pan rallado", "fideos"]
    },
    "SAUCES_SPICES": {
      name: "Salsas y Especias",
      icon: "🧂",
      color: "#FF5722",
      keywords: ["sal", "azúcar", "pimienta", "orégano", "vinagre", "aceite de oliva", "aceite de girasol", "salsa de tomate", "mayonesa", "ketchup", "mostaza", "salsa barbacoa", "caldo concentrado", "curry"]
    },
    "PERSONAL_CARE": {
      name: "Cuidado Personal",
      icon: "🧴",
      color: "#E91E63",
      keywords: ["champú", "gel de baño", "desodorante", "pasta de dientes", "cepillo de dientes", "maquinilla de afeitar", "cuchillas", "papel higiénico", "pañuelos", "toallitas"]
    },
    "PET": {
      name: "Mascotas",
      icon: "🐕",
      color: "#9C27B0",
      keywords: ["comida para perros", "comida para gatos", "arena para gatos", "huesos", "snacks para mascotas", "juguetes para mascotas", "collar", "champú para mascotas"]
    },
    "BABY": {
      name: "Bebé",
      icon: "👶",
      color: "#FF80AB",
      keywords: ["pañales", "toallitas húmedas", "papilla", "leche infantil", "biberones", "crema para bebés"]
    },
    "OTHER": {
      name: "Otros",
      icon: "📦",
      color: "#9E9E9E",
      keywords: ["pilas", "velas", "encendedor", "bolsas de basura", "revista", "cuaderno", "bombilla"]
    },
    "COMPRADO": {
      name: "Comprado",
      icon: "✅",
      color: "#4CAF50",
      keywords: []
    }
  };

  // Función para mostrar toasts
  const showToast = (message, type = 'info') => {
    const toastConfig = {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    switch (type) {
      case 'success':
        toast.success(message, toastConfig);
        break;
      case 'error':
        toast.error(message, toastConfig);
        break;
      case 'warning':
        toast.warning(message, toastConfig);
        break;
      case 'info':
      default:
        toast.info(message, toastConfig);
        break;
    }
  };

  // Función mejorada para detectar categorías
  const detectCategory = (productName) => {
    if (productName.startsWith("[COMPLETADO]")) {
      return "COMPRADO";
    }

    const normalizedText = productName.toLowerCase().trim();
    const textWithoutQuantities = normalizedText.replace(/\d+(kg|g|l|ml|gr|lb|oz)/g, "").trim();
    const cleanText = textWithoutQuantities.replace(/\b(el|la|los|las|de|con|del|un|una|unos|unas)\b/g, "").trim();

    const firstWord = cleanText.split(" ")[0] || "";

    // Buscar por primera palabra
    for (const [category, data] of Object.entries(CATEGORIES)) {
      if (data.keywords.some(keyword => firstWord.includes(keyword))) {
        return category;
      }
    }

    // Buscar en todo el texto
    for (const [category, data] of Object.entries(CATEGORIES)) {
      if (data.keywords.some(keyword => cleanText.includes(keyword))) {
        return category;
      }
    }

    return "OTHER";
  };

  // Función para obtener información de categoría
  const getCategoryInfo = (category) => {
    return CATEGORIES[category] || CATEGORIES.OTHER;
  };

  // Hook personalizado para gestión de listas - SIMPLIFICADO
  const createElegantList = async (listName) => {
    if (!auth.currentUser?.uid || !listName.trim()) {
      throw new Error("Nombre de lista inválido");
    }

    try {
      const tempId = `temp-${Date.now()}`;
      const tempList = {
        id: tempId,
        name: listName.trim(),
        userId: auth.currentUser.uid,
        ownerEmail: auth.currentUser.email,
        sharedWith: [],
        createdAt: new Date(),
        isOptimistic: true
      };

      // Actualización optimista
      setLists(prev => [...prev, tempList]);
      setCurrentList(tempId);

      // Persistencia en Firebase
      const docRef = await addDoc(collection(db, "lists"), {
        name: listName.trim(),
        userId: auth.currentUser.uid,
        ownerEmail: auth.currentUser.email,
        sharedWith: [],
        createdAt: new Date()
      });

      // Reemplazar lista temporal con la real
      setLists(prev =>
        prev.map(list =>
          list.id === tempId
            ? { ...list, id: docRef.id, isOptimistic: false }
            : list
        )
      );

      setCurrentList(docRef.id);
      showToast(`Lista "${listName}" creada exitosamente`, 'success');
      return docRef.id;

    } catch (err) {
      console.error("Error creando lista:", err);
      // Revertir actualización optimista
      setLists(prev => prev.filter(list => list.id !== tempId));
      if (currentList === tempId) {
        setCurrentList(lists[0]?.id || "");
      }
      throw err;
    }
  };

  const addElegantItem = async (itemText) => {
    if (!userReady || !auth.currentUser?.uid || !currentList || !itemText.trim()) {
      throw new Error("Datos inválidos para añadir item");
    }

    try {
      const tempId = `temp-item-${Date.now()}`;
      const detectedCategory = detectCategory(itemText);

      const newItemObj = {
        id: tempId,
        text: itemText.trim(),
        listId: currentList,
        userId: auth.currentUser.uid,
        addedBy: auth.currentUser.email,
        completed: false,
        category: detectedCategory,
        createdAt: new Date(),
        isOptimistic: true
      };

      // Actualización optimista
      setItems(prev => [...prev, newItemObj]);

      // Solo agregar a Firebase si no es una lista temporal
      if (!currentList.startsWith('temp-')) {
        const docRef = await addDoc(collection(db, "items"), {
          text: newItemObj.text,
          listId: currentList,
          userId: auth.currentUser.uid,
          addedBy: auth.currentUser.email,
          completed: false,
          category: newItemObj.category,
          createdAt: new Date()
        });

        // Reemplazar item temporal con el real
        setItems(prev => prev.map(item =>
          item.id === tempId
            ? { ...item, id: docRef.id, isOptimistic: false }
            : item
        ));
      }

      showToast(`Producto "${itemText}" añadido`, 'success');
      return tempId;
    } catch (err) {
      console.error("Error añadiendo producto:", err);
      // Revertir actualización optimista
      setItems(prev => prev.filter(item => item.id !== tempId));
      throw err;
    }
  };

  const toggleItemCompletion = async (itemId, currentStatus) => {
    if (!itemId || !auth.currentUser) {
      console.log('ID de item no válido o usuario no autenticado:', itemId);
      return;
    }

    try {
      const currentItem = items.find(item => item.id === itemId);
      if (!currentItem) {
        console.log('Item no encontrado:', itemId);
        return;
      }

      const newCompletedStatus = !currentStatus;
      const userEmail = auth.currentUser?.email || "";

      // Actualización optimista MEJORADA
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? {
            ...item,
            completed: newCompletedStatus,
            purchasedBy: newCompletedStatus ? userEmail : "",
            purchasedAt: newCompletedStatus ? new Date() : null,
            category: newCompletedStatus ? "COMPRADO" : detectCategory(currentItem.text)
          }
          : item
      ));

      // Preparar datos para Firebase - MÁS ROBUSTO
      const updates = {
        completed: newCompletedStatus,
        category: newCompletedStatus ? "COMPRADO" : detectCategory(currentItem.text),
        updatedAt: new Date()
      };

      // Solo añadir información de compra si se marca como completado
      if (newCompletedStatus) {
        updates.purchasedBy = userEmail;
        updates.purchasedAt = new Date();
      } else {
        // Si se desmarca, limpiar la información de compra
        updates.purchasedBy = "";
        updates.purchasedAt = null;
      }

      console.log("Actualizando item en Firebase:", itemId, updates);

      const itemRef = doc(db, "items", itemId);

      // Verificar que el documento existe antes de actualizar
      const docSnap = await getDoc(itemRef);
      if (!docSnap.exists()) {
        throw new Error("El producto no existe en la base de datos");
      }

      await updateDoc(itemRef, updates);

      const action = newCompletedStatus ? 'marcado como comprado' : 'desmarcado';
      showToast(`Producto ${action}`, 'success');

    } catch (err) {
      console.error("Error actualizando item:", err);

      // Revertir cambios en caso de error
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, completed: currentStatus }
          : item
      ));

      showToast("Error al actualizar el producto: " + err.message, 'error');
    }
  };

  // Cargar observaciones de la lista
  const loadListObservations = async (listId) => {
    try {
      const obsDoc = await getDoc(doc(db, "listObservations", listId));
      if (obsDoc.exists()) {
        const observations = obsDoc.data().observations || "";
        setListObservations(prev => ({
          ...prev,
          [listId]: observations
        }));
      } else {
        setListObservations(prev => ({
          ...prev,
          [listId]: ""
        }));
      }
    } catch (error) {
      console.error("Error cargando observaciones:", error);
    }
  };

  // Guardar observaciones de la lista
  const saveListObservations = async (listId, observations) => {
    try {
      await setDoc(doc(db, "listObservations", listId), {
        observations: observations,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.email || ""
      });

      setListObservations(prev => ({
        ...prev,
        [listId]: observations
      }));
      showToast('Observaciones guardadas', 'success');
    } catch (error) {
      console.error("Error guardando observaciones:", error);
      showToast("Error al guardar observaciones: " + error.message, 'error');
    }
  };

  // Cargar información de compra
  const loadPurchaseInfo = async (listId) => {
    try {
      const listDoc = await getDoc(doc(db, "lists", listId));
      if (listDoc.exists()) {
        const data = listDoc.data();
        setPurchaseInfo(prev => ({
          ...prev,
          [listId]: data.purchaseInfo || null
        }));
        setExtraInfo(prev => ({
          ...prev,
        }));
      }
    } catch (error) {
      console.error("Error cargando información de compra:", error);
    }
  };

  // Finalizar compra - guardar precio total
  const finalizePurchase = async (listId, totalPrice) => {
    try {
      if (totalPrice !== null) {
        const purchaseInfoData = {
          totalPrice: parseFloat(totalPrice),
          finalizedAt: new Date(),
          finalizedBy: auth.currentUser?.email || "",
          autoCalculated: false
        };

        await updateDoc(doc(db, "lists", listId), {
          purchaseInfo: purchaseInfoData
        });

        setPurchaseInfo(prev => ({
          ...prev,
          [listId]: purchaseInfoData
        }));

        showToast(`Precio guardado: ${totalPrice} €`, 'success');
      } else {
        await updateDoc(doc(db, "lists", listId), {
          purchaseInfo: null
        });

        setPurchaseInfo(prev => ({
          ...prev,
          [listId]: null
        }));

        showToast("Precio eliminado", 'info');
      }
    } catch (error) {
      console.error("Error finalizando compra:", error);
      showToast("Error al guardar precio: " + error.message, 'error');
    }
  };

  // Dividir gastos
  const splitExpenses = (totalAmount, participants) => {
    const sharePerPerson = totalAmount / participants.length;

    const result = `Resumen de Gastos\n\n
Total gastado: ${totalAmount.toFixed(2)} €\n
Número de personas: ${participants.length}\n
Precio por persona: ${sharePerPerson.toFixed(2)} €\n\n
${participants.map((p, i) => `${i + 1}. ${p}: ${sharePerPerson.toFixed(2)} €`).join('\n')}`;

    navigator.clipboard.writeText(result);
    showToast("Resumen copiado al portapapeles", 'success');
  };

  // Cargar precios de items
  const loadItemPrices = async (listId, items) => {
    try {
      const prices = {};

      for (const item of items) {
        if (item.id && !item.id.startsWith('temp-')) {
          try {
            const priceDoc = await getDoc(doc(db, "itemPrices", item.id));
            if (priceDoc.exists()) {
              const price = priceDoc.data().price;
              if (price) {
                prices[item.id] = {
                  amount: price,
                  listId: listId
                };
              }
            }
          } catch (error) {
            console.log("Error cargando precio para item:", item.id, error);
          }
        }
      }

      setItemPrices(prev => ({
        ...prev,
        [listId]: prices
      }));
    } catch (error) {
      console.error("Error cargando precios de items:", error);
    }
  };

  // Guardar precio de item individual
  const saveItemPrice = async (itemId, price, listId) => {
    try {
      if (itemId && !itemId.startsWith('temp-')) {
        await setDoc(doc(db, "itemPrices", itemId), {
          price: parseFloat(price),
          updatedAt: new Date(),
          listId: listId
        });

        setItemPrices(prev => ({
          ...prev,
          [listId]: {
            ...prev[listId],
            [itemId]: {
              amount: parseFloat(price),
              listId: listId
            }
          }
        }));

        updateTotalPrice(listId);
        showToast(`Precio guardado: ${price}€`, 'success');
      }
    } catch (error) {
      console.error("Error guardando precio de item:", error);
      showToast("Error al guardar precio: " + error.message, 'error');
    }
  };

  // Actualizar precio total automáticamente
  const updateTotalPrice = async (listId) => {
    try {
      const currentItemPrices = itemPrices[listId] || {};
      const totalPrice = Object.values(currentItemPrices).reduce((sum, price) => sum + price.amount, 0);

      const purchaseInfoData = {
        totalPrice: totalPrice,
        finalizedAt: new Date(),
        finalizedBy: auth.currentUser?.email || "",
        autoCalculated: true,
        itemPrices: currentItemPrices
      };

      await updateDoc(doc(db, "lists", listId), {
        purchaseInfo: purchaseInfoData
      });

      setPurchaseInfo(prev => ({
        ...prev,
        [listId]: purchaseInfoData
      }));
    } catch (error) {
      console.error("Error actualizando precio total:", error);
    }
  };

  // Efectos
  useEffect(() => {
    if (currentList) {
      loadListObservations(currentList);
      loadPurchaseInfo(currentList);
    }
  }, [currentList]);

  useEffect(() => {
    if (currentList && items.length > 0) {
      loadItemPrices(currentList, items);
    }
  }, [currentList, items]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserReady(true);
        loadInitialData(user);
      } else {
        setUserReady(false);
        resetState();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const resetState = () => {
    setItems([]);
    setLists([]);
    setSharedLists([]);
    setCurrentList("");
    itemsCache.current = {};
    listsCache.current = { userLists: [], sharedLists: [] };
  };

  const loadInitialData = async (user) => {
    try {
      setLoading(true);

      if (!listsCache.current.userLists.length) {
        listsCache.current.userLists = [];
      }
      if (!listsCache.current.sharedLists.length) {
        listsCache.current.sharedLists = [];
      }

      const [userUnsubscribe, sharedUnsubscribe] = await Promise.all([
        loadUserLists(user),
        loadSharedLists(user)
      ]);

      const allLists = [
        ...listsCache.current.userLists,
        ...listsCache.current.sharedLists
      ];

      if (allLists.length > 0 && !currentList) {
        setCurrentList(allLists[0].id);
      }

      return () => {
        userUnsubscribe();
        sharedUnsubscribe();
      };
    } catch (err) {
      console.error("Error loading initial data:", err);
      setError(`Error loading data: ${err.message}`);
      showToast(`Error cargando datos: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserLists = async (user) => {
    const userListsQuery = query(
      collection(db, "lists"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(userListsQuery, (snapshot) => {
      const userLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      listsCache.current.userLists = userLists;
      setLists(userLists);
    });

    return unsubscribe;
  };

  const loadSharedLists = async (user) => {
    const sharedListsQuery = query(
      collection(db, "lists"),
      where("sharedWith", "array-contains", user.email)
    );

    const unsubscribe = onSnapshot(sharedListsQuery, (snapshot) => {
      const sharedListsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        ownerEmail: doc.data().ownerEmail || ""
      }));

      listsCache.current.sharedLists = sharedListsData;
      setSharedLists(sharedListsData);
    });

    return unsubscribe;
  };

  // Efecto para items - CORREGIDO Y MEJORADO
  useEffect(() => {
    if (!currentList) {
      setItems([]);
      return;
    }

    console.log("Suscribiéndose a items para lista:", currentList);

    const q = query(
      collection(db, "items"),
      where("listId", "==", currentList)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        console.log("Nuevos datos recibidos:", snapshot.docs.length, "items");

        const updatedItems = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Procesando item:", doc.id, data);

          // Asegurar que todos los campos necesarios existen
          const categoryInfo = getCategoryInfo(data.category || "OTHER");

          return {
            id: doc.id,
            text: data.text || "",
            listId: data.listId || currentList,
            userId: data.userId || "",
            addedBy: data.addedBy || "",
            completed: data.completed || false,
            purchasedBy: data.purchasedBy || "",
            purchasedAt: data.purchasedAt || null,
            category: data.category || "OTHER",
            createdAt: data.createdAt || new Date(),
            categoryColor: categoryInfo.color,
            categoryIcon: categoryInfo.icon,
            isOptimistic: false
          };
        });

        // Combinar con items optimistas
        const optimisticItems = items.filter(item =>
          item.isOptimistic && item.listId === currentList
        );
        const combinedItems = [...optimisticItems, ...updatedItems];

        console.log("Items combinados:", combinedItems.length);

        setItems(combinedItems);
      },
      (error) => {
        console.error("Error en listener de items:", error);
        setError(`Error al cargar productos: ${error.message}`);
        showToast(`Error al cargar productos: ${error.message}`, 'error');
      }
    );

    return unsubscribe;
  }, [currentList]);

  // Función elegante para crear lista - CORREGIDA
  const handleCreateList = async (listName) => {
    try {
      if (!listName.trim()) return;

      await createElegantList(listName);
      // El input se limpia en el componente ElegantListCreator después del éxito
    } catch (err) {
      console.error("Error creando lista:", err);
      setError(`Error al crear lista: ${err.message}`);
      showToast(`Error al crear lista: ${err.message}`, 'error');
    }
  };

  // Función elegante para añadir item - CORREGIDA
  const handleAddItem = async (itemText) => {
    try {
      if (!itemText.trim()) return;

      await addElegantItem(itemText);
      // El input se limpia en el componente ElegantItemAdder después del éxito
    } catch (err) {
      console.error("Error añadiendo producto:", err);
      setError(`Error al añadir producto: ${err.message}`);
      showToast(`Error al añadir producto: ${err.message}`, 'error');
    }
  };

  const deleteItem = async (id) => {
    try {
      setLoading(true);

      if (!currentList || !auth.currentUser) {
        throw new Error("No se puede eliminar el producto en este momento");
      }

      const itemToDelete = items.find(item => item.id === id);
      if (!itemToDelete) {
        throw new Error("Producto no encontrado");
      }

      console.log("Eliminando item:", id, "de la lista:", currentList);

      // Actualización optimista - eliminar inmediatamente del estado local
      setItems(prev => prev.filter(item => item.id !== id));
      setConfirmDelete(null);

      // Solo eliminar de Firebase si no es un item temporal
      if (id && !id.startsWith('temp-')) {
        try {
          // Verificar que el documento existe antes de eliminar
          const itemRef = doc(db, "items", id);
          const docSnap = await getDoc(itemRef);

          if (docSnap.exists()) {
            console.log("Eliminando item de Firebase:", id);
            await deleteDoc(itemRef);
            console.log("Item eliminado exitosamente de Firebase");

            // Intentar eliminar el precio asociado si existe
            try {
              const priceRef = doc(db, "itemPrices", id);
              const priceSnap = await getDoc(priceRef);
              if (priceSnap.exists()) {
                await deleteDoc(priceRef);
                console.log("Precio eliminado exitosamente");

                // Actualizar el estado local de precios
                setItemPrices(prev => {
                  const updatedPrices = { ...prev };
                  if (updatedPrices[currentList]) {
                    delete updatedPrices[currentList][id];
                  }
                  return updatedPrices;
                });
              }
            } catch (priceError) {
              console.log("No se encontró precio para eliminar o error al eliminar:", priceError);
            }
          } else {
            console.log("El item ya no existe en Firebase, solo se eliminó localmente");
          }
        } catch (firestoreError) {
          console.error("Error al eliminar de Firebase:", firestoreError);
          throw new Error(`Error al eliminar de la base de datos: ${firestoreError.message}`);
        }
      } else {
        console.log("Eliminando item temporal, solo actualización local");
      }

      showToast('Producto eliminado', 'success');

    } catch (err) {
      console.error("Error borrando producto:", err);

      // Revertir en caso de error - buscar el item original
      const originalItem = confirmDelete || items.find(item => item.id === id);
      if (originalItem) {
        setItems(prev => [...prev, originalItem]);
      }

      showToast("Error al eliminar producto: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteList = async (listId) => {
    if (!auth.currentUser?.uid) return;

    try {
      const listDoc = await getDoc(doc(db, "lists", listId));
      if (listDoc.data()?.userId !== auth.currentUser.uid) {
        throw new Error("Solo el dueño puede eliminar la lista");
      }

      const batch = writeBatch(db);

      // Eliminar items
      const itemsQuery = query(collection(db, "items"), where("listId", "==", listId));
      const itemsSnapshot = await getDocs(itemsQuery);

      itemsSnapshot.forEach((itemDoc) => {
        batch.delete(doc(db, "items", itemDoc.id));
        batch.delete(doc(db, "itemPrices", itemDoc.id));
      });

      // ELIMINAR OBSERVACIONES DE LA LISTA - NUEVO
      batch.delete(doc(db, "listObservations", listId));

      // Eliminar la lista
      batch.delete(doc(db, "lists", listId));

      await batch.commit();

      // Limpiar el estado local de observaciones
      setListObservations(prev => {
        const newObservations = { ...prev };
        delete newObservations[listId];
        return newObservations;
      });

      setConfirmListDelete(null);

      if (currentList === listId) {
        setCurrentList("");
      }

      // Mostrar mensaje de éxito
      showToast("Lista eliminada exitosamente", 'success');

    } catch (err) {
      console.error("Error eliminando lista:", err);
      setError(`Error al eliminar: ${err.message}`);
      showToast(`Error al eliminar: ${err.message}`, 'error');

      // Revertir cambios locales en caso de error
      if (currentList === listId) {
        setCurrentList(listId);
      }
    }
  };

  const openShareDialog = () => {
    if (!currentList) return;

    const currentListData = [...lists, ...sharedLists].find(list => list.id === currentList);
    setSharedUsers(currentListData?.sharedWith || []);
    setShareDialogOpen(true);
  };

  const unshareList = async () => {
    if (!currentList || !userToUnshare) return;

    try {
      const tempSharedUsers = sharedUsers.filter(email => email !== userToUnshare);
      setSharedUsers(tempSharedUsers);

      setLists(prev => prev.map(list =>
        list.id === currentList
          ? { ...list, sharedWith: tempSharedUsers }
          : list
      ));

      await updateDoc(doc(db, "lists", currentList), {
        sharedWith: arrayRemove(userToUnshare)
      });

      const batch = writeBatch(db);
      const itemsQuery = query(
        collection(db, "items"),
        where("listId", "==", currentList),
        where("userId", "==", userToUnshare)
      );

      const querySnapshot = await getDocs(itemsQuery);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      setUnshareDialogOpen(false);
      setUserToUnshare("");
      showToast(`Lista dejada de compartir con ${userToUnshare}`, 'success');
    } catch (err) {
      console.error("Error eliminando compartido:", err);
      setSharedUsers([...sharedUsers, userToUnshare]);
      setError(`Error al eliminar compartido: ${err.message}`);
      showToast(`Error al eliminar compartido: ${err.message}`, 'error');
    }
  };

  const getCurrentListName = () => {
    const list = allLists.find(list => list.id === currentList);
    if (!list) return "";

    if (sharedLists.some(sharedList => sharedList.id === currentList)) {
      return `${list.name} (de ${list.ownerEmail?.split('@')[0] || 'Usuario'})`;
    }

    return list.name;
  };

  // Verificar si el usuario actual es el propietario de la lista actual
  const isCurrentListOwned = () => {
    return lists.some(list => list.id === currentList);
  };

  // Verificar si la lista actual es compartida con el usuario
  const isCurrentListShared = () => {
    return sharedLists.some(list => list.id === currentList);
  };

  // Verificar si el usuario actual tiene acceso a la lista (propietario o compartida)
  const userHasAccessToList = (listId) => {
    return allLists.some(list => list.id === listId);
  };

  const isListSharedByMe = (list) => {
    return list.sharedWith && list.sharedWith.length > 0;
  };

  const sortedItems = [...items].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.category !== b.category) {
      return (a.category || "OTHER").localeCompare(b.category || "OTHER");
    }
    return a.text.localeCompare(b.text);
  });

  const checkUserExists = async (email) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error en verificación:", error);
      return true;
    }
  };

  const isCurrentListSharedByMe = () => {
    const currentListData = lists.find(list => list.id === currentList);
    return currentListData && currentListData.sharedWith && currentListData.sharedWith.length > 0;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const shareList = async () => {
    if (!currentList || !emailToShare.trim() || !auth.currentUser?.uid) return;

    setEmailValidation({ valid: true, message: "" });

    if (!isValidEmail(emailToShare.trim())) {
      setEmailValidation({
        valid: false,
        message: "Formato de email inválido"
      });
      return;
    }

    if (emailToShare.trim().toLowerCase() === auth.currentUser.email.toLowerCase()) {
      setEmailValidation({
        valid: false,
        message: "No puedes compartir la lista contigo mismo"
      });
      return;
    }

    if (sharedUsers.includes(emailToShare.trim().toLowerCase())) {
      setEmailValidation({
        valid: false,
        message: "Esta lista ya está compartida con este usuario"
      });
      return;
    }

    try {
      setLoading(true);

      const userExists = await checkUserExists(emailToShare.trim());

      if (!userExists) {
        setEmailValidation({
          valid: false,
          message: "No se encontró un usuario con este email"
        });
        return;
      }

      const tempSharedUsers = [...sharedUsers, emailToShare.trim().toLowerCase()];
      setSharedUsers(tempSharedUsers);

      await updateDoc(doc(db, "lists", currentList), {
        sharedWith: arrayUnion(emailToShare.trim().toLowerCase())
      });

      setEmailToShare("");
      setEmailValidation({ valid: true, message: "¡Lista compartida exitosamente!" });
      showToast(`Lista compartida con ${emailToShare}`, 'success');

      setTimeout(() => {
        setEmailValidation({ valid: true, message: "" });
        setShareDialogOpen(false);
      }, 3000);

    } catch (err) {
      console.error("Error compartiendo lista:", err);
      setSharedUsers(sharedUsers.filter(email => email !== emailToShare.trim().toLowerCase()));
      setEmailValidation({
        valid: false,
        message: `Error al compartir: ${err.message}`
      });
      showToast(`Error al compartir: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Componente para la sección de información de la lista
  const ListInfoSection = () => {
    if (!currentList) return null;

    const currentPurchaseInfo = purchaseInfo[currentList];
    const currentObservations = listObservations[currentList] || "";
    const currentListData = allLists.find(list => list.id === currentList);
    const currentItemPrices = itemPrices[currentList] || {};

    const autoCalculatedTotal = Object.values(currentItemPrices).reduce((sum, price) => sum + price.amount, 0);
    const effectiveTotalPrice = currentPurchaseInfo?.totalPrice || autoCalculatedTotal;

    return (
      <div className="list-info-section" style={{ marginBottom: "3%" }}>
        <div className="list-info-header">
          <h4>Información de la Lista</h4>
          <div className="list-info-actions">
            <button
              onClick={() => setObservationsDialogOpen(true)}
              className="action-btn"
              title="Observaciones"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer"
              }}
            >
              📝
            </button>
            <button
              onClick={() => setFinalizeDialogOpen(true)}
              className="action-btn"
              title="Finalizar Compra"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer"
              }}
            >
              💰
            </button>
            <button
              onClick={() => setSplitDialogOpen(true)}
              className="action-btn"
              title="Dividir Gastos"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer"
              }}
            >
              👥
            </button>
          </div>
        </div>

        {currentObservations && (
          <div className="observations-preview">
            <strong>Observaciones:</strong>
            <p>{currentObservations.length > 100
              ? currentObservations.substring(0, 100) + "..."
              : currentObservations}</p>
          </div>
        )}
      </div>
    );
  };

  // Agrupar items por categoría para mostrar
  const groupItemsByCategory = (itemsList) => {
    const grouped = {};

    itemsList.forEach(item => {
      const category = item.category || "OTHER";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  };

  const pendingItems = sortedItems.filter(item => !item.completed);
  const completedItems = sortedItems.filter(item => item.completed);
  const groupedPendingItems = groupItemsByCategory(pendingItems);

  // Componente elegante para renderizar items
  const ElegantItem = ({ item }) => {
    const isSharedList = isCurrentListShared();
    const currentUserEmail = auth.currentUser?.email;
    const itemPrice = itemPrices[currentList]?.[item.id]?.amount;

    // Calcular categoryInfo dinámicamente basado en la categoría del item
    const categoryInfo = getCategoryInfo(item.category || "OTHER");

    // Verificar si el usuario actual tiene acceso a la lista
    const userHasAccess = currentList && allLists.some(list => list.id === currentList);

    return (
      <li className="elegant-item" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        marginBottom: '8px',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${categoryInfo.color}`,
        transition: 'all 0.3s ease',
        opacity: item.completed ? 0.7 : 1
      }}>
        <div className="item-content" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div className="category-indicator" style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: categoryInfo.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            {categoryInfo.icon}
          </div>

          <input
            type="checkbox"
            checked={item.completed}
            onChange={(e) => {
              e.stopPropagation();
              toggleItemCompletion(item.id, item.completed);
            }}
            className="elegant-checkbox"
            style={{
              width: '20px',
              height: '20px',
              accentColor: '#10B981',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          />

          <div className="item-text-container" style={{ flex: 1 }}>
            <span
              className="item-text"
              style={{
                fontSize: '16px',
                fontWeight: '500',
                color: item.completed ? '#9CA3AF' : '#374151',
                textDecoration: item.completed ? 'line-through' : 'none',
                display: 'block'
              }}
            >
              {item.text}
              {item.isOptimistic && (
                <span style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  marginLeft: '8px',
                  fontStyle: 'italic'
                }}>
                  (guardando...)
                </span>
              )}
            </span>

            {/* INFORMACIÓN DE QUIÉN AÑADIÓ Y QUIÉN COMPRÓ */}
            <div className="item-metadata" style={{
              fontSize: '12px',
              color: '#6B7280',
              marginTop: '4px'
            }}>
              <span className="added-by-info">
                Añadido por: {item.addedBy?.split('@')[0] || 'Usuario'}
              </span>
              {item.completed && item.purchasedBy && (
                <span className="purchaser-info" style={{ marginLeft: '12px' }}>
                  • Comprado por: {item.purchasedBy?.split('@')[0] || 'Usuario'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="item-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {itemPrice && (
            <span className="item-price" style={{
              backgroundColor: '#10B981',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {itemPrice.toFixed(2)}€
            </span>
          )}

          {/* PERMITIR ELIMINAR ITEMS A TODOS LOS USUARIOS CON ACCESO A LA LISTA */}
          {currentList && ( // Solo mostrar si hay una lista seleccionada
            <button
              onClick={() => setConfirmDelete(item)}
              disabled={loading || item.isOptimistic}
              className="elegant-delete-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: loading || item.isOptimistic ? 'not-allowed' : 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading || item.isOptimistic ? 0.5 : 1
              }}
              title="Eliminar producto"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ color: '#EF4444' }}
              >
                <path
                  d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </li>
    );
  };

  // Componente elegante para crear listas - CORREGIDO
  const ElegantListCreator = () => {
    const [localListName, setLocalListName] = useState("");

    const handleCreate = async () => {
      if (!localListName.trim()) return;

      try {
        await handleCreateList(localListName);
        setLocalListName(""); // Limpiar solo si fue exitoso
      } catch (error) {
        // El error ya se maneja en handleCreateList
        console.error("Error en creación de lista:", error);
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleCreate();
      }
    };

    return (
      <div className="elegant-list-creator" style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#F8FAFC',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        alignItems: 'stretch',
        flexWrap: 'wrap'
      }}>
        <input
          value={localListName}
          onChange={(e) => setLocalListName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nombre de nueva lista..."
          className="elegant-input"
          style={{
            flex: '1 1 200px',
            minWidth: '0',
            padding: '12px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: '16px',
            color: '#1F2937',
            backgroundColor: 'white',
            outline: 'none',
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
        />
        <button
          onClick={handleCreate}
          disabled={loading || !localListName.trim()}
          className="elegant-create-btn"
          style={{
            flex: '0 0 auto',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: !localListName.trim() ? '#9CA3AF' : '#3B82F6',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !localListName.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minWidth: '140px',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            if (localListName.trim()) {
              e.target.style.backgroundColor = '#2563EB';
            }
          }}
          onMouseLeave={(e) => {
            if (localListName.trim()) {
              e.target.style.backgroundColor = '#3B82F6';
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="button-text">Crear Lista</span>
        </button>

        <style jsx>{`
        @media (max-width: 640px) {
          .elegant-list-creator {
            flex-direction: column;
            gap: 12px;
            padding: 12px;
          }
          
          .elegant-input {
            flex: 1 1 auto;
            min-width: 100%;
            font-size: 16px; /* Previene zoom en iOS */
          }
          
          .elegant-create-btn {
            flex: 0 0 auto;
            width: 100%;
            min-width: auto;
            padding: 14px 16px;
          }
          
          .button-text {
            display: block;
          }
        }
        
        @media (max-width: 480px) {
          .elegant-list-creator {
            margin-bottom: 16px;
            padding: 12px;
          }
          
          .elegant-input {
            padding: 14px 12px;
            font-size: 16px;
          }
          
          .elegant-create-btn {
            padding: 14px 12px;
            font-size: 16px;
          }
        }
        
        @media (max-width: 380px) {
          .elegant-list-creator {
            gap: 10px;
            padding: 10px;
          }
          
          .elegant-input {
            padding: 12px;
            font-size: 16px;
          }
          
          .elegant-create-btn {
            padding: 12px;
            font-size: 15px;
          }
          
          .elegant-create-btn svg {
            width: 18px;
            height: 18px;
          }
        }
        
        /* Para tablets en modo vertical */
        @media (min-width: 641px) and (max-width: 768px) {
          .elegant-list-creator {
            gap: 10px;
          }
          
          .elegant-input {
            flex: 1 1 150px;
          }
          
          .elegant-create-btn {
            min-width: 130px;
            padding: 12px 16px;
          }
        }
        
        /* Mejora la experiencia táctil en dispositivos móviles */
        @media (hover: none) {
          .elegant-create-btn:hover {
            background-color: inherit;
          }
          
          .elegant-create-btn:active {
            background-color: #2563EB;
            transform: scale(0.98);
          }
        }
      `}</style>
      </div>
    );
  };

  // Componente elegante para añadir items - COMPLETAMENTE RESPONSIVE
  const ElegantItemAdder = () => {
    const [localItem, setLocalItem] = useState("");

    const handleAdd = async () => {
      if (!localItem.trim()) return;

      try {
        await handleAddItem(localItem);
        setLocalItem(""); // Limpiar solo si fue exitoso
      } catch (error) {
        // El error ya se maneja en handleAddItem
        console.error("Error en añadir item:", error);
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleAdd();
      }
    };

    return (
      <div className="elegant-item-adder" style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'stretch',
        flexWrap: 'wrap'
      }}>
        <input
          value={localItem}
          onChange={(e) => setLocalItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Añadir nuevo producto..."
          className="elegant-input"
          style={{
            flex: '1 1 200px',
            minWidth: '0',
            padding: '12px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: '16px',
            color: '#1F2937',
            backgroundColor: 'white',
            outline: 'none',
            transition: 'all 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
        />
        <button
          onClick={handleAdd}
          disabled={!localItem.trim()}
          className="elegant-add-btn"
          style={{
            flex: '0 0 auto',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: !localItem.trim() ? '#9CA3AF' : '#10B981',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !localItem.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minWidth: '120px',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            if (localItem.trim()) {
              e.target.style.backgroundColor = '#059669';
            }
          }}
          onMouseLeave={(e) => {
            if (localItem.trim()) {
              e.target.style.backgroundColor = '#10B981';
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="button-text">Añadir</span>
        </button>

        <style jsx>{`
        @media (max-width: 640px) {
          .elegant-item-adder {
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .elegant-input {
            flex: 1 1 auto;
            min-width: 100%;
            font-size: 16px; /* Previene zoom en iOS */
            padding: 14px 16px;
          }
          
          .elegant-add-btn {
            flex: 0 0 auto;
            width: 100%;
            min-width: auto;
            padding: 14px 16px;
          }
          
          .button-text {
            display: block;
          }
        }
        
        @media (max-width: 480px) {
          .elegant-item-adder {
            margin-bottom: 16px;
          }
          
          .elegant-input {
            padding: 14px 12px;
            font-size: 16px;
          }
          
          .elegant-add-btn {
            padding: 14px 12px;
            font-size: 16px;
          }
        }
        
        @media (max-width: 380px) {
          .elegant-item-adder {
            gap: 10px;
          }
          
          .elegant-input {
            padding: 12px;
            font-size: 16px;
          }
          
          .elegant-add-btn {
            padding: 12px;
            font-size: 15px;
          }
          
          .elegant-add-btn svg {
            width: 18px;
            height: 18px;
          }
        }
        
        /* Para tablets en modo vertical */
        @media (min-width: 641px) and (max-width: 768px) {
          .elegant-item-adder {
            gap: 10px;
          }
          
          .elegant-input {
            flex: 1 1 150px;
          }
          
          .elegant-add-btn {
            min-width: 110px;
            padding: 12px 16px;
          }
        }
        
        /* Para pantallas muy grandes */
        @media (min-width: 1200px) {
          .elegant-item-adder {
            gap: 16px;
          }
          
          .elegant-input {
            flex: 1 1 300px;
          }
        }
        
        /* Mejora la experiencia táctil en dispositivos móviles */
        @media (hover: none) {
          .elegant-add-btn:hover {
            background-color: inherit;
          }
          
          .elegant-add-btn:active {
            background-color: #059669;
            transform: scale(0.98);
          }
        }
        
        /* Mejoras de accesibilidad */
        .elegant-input:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .elegant-add-btn:focus {
          outline: 2px solid #3B82F6;
          outline-offset: 2px;
        }
        
        /* Estados de loading mejorados */
        .elegant-add-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
      </div>
    );
  };

  if (loading) return (
    <div className="elegant-loading" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '50vh',
      color: '#6B7280'
    }}>
      <div className="elegant-spinner" style={{
        width: '40px',
        height: '40px',
        border: '4px solid #E5E7EB',
        borderTop: '4px solid #3B82F6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '16px'
      }}></div>
      <p style={{ fontSize: '18px', fontWeight: '500' }}>Cargando...</p>
    </div>
  );

  if (error) return (
    <div className="elegant-error" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '50vh',
      color: '#DC2626',
      textAlign: 'center',
      padding: '20px'
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px' }}>
        <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '16px' }}>Error: {error}</p>
      <button
        onClick={() => setError(null)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3B82F6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '500',
          cursor: 'pointer'
        }}
      >
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="elegant-app-container" style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6'
    }}>

      <ToastContainer
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          maxWidth: '90%'
        }}
        closeButton={false}
        autoClose={2000}
        hideProgressBar={true}
      />

      <nav className="elegant-navbar" style={{
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        padding: '16px 0',
        marginBottom: '24px'
      }}>
        <div className="navbar-content" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div className="logo-container" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <img
              src="/logo.png"
              alt="BuyNote Logo"
              width="50"
              height="50"
              style={{ objectFit: 'contain' }}
            />
            <span className="app-name" style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1F2937',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              BuyNote
            </span>
          </div>

          <div className="navbar-actions">
            <button
              className="elegant-logout-btn"
              onClick={() => signOut(auth)}
              title="Cerrar sesión"
              style={{
                padding: '8px 16px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#F3F4F6';
                e.target.style.borderColor = '#9CA3AF';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#D1D5DB';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="elegant-main-content" style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <div className="elegant-content-card" style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: '32px',
          marginBottom: '32px'
        }}>
          {/* Creador elegante de listas */}
          <ElegantListCreator />

          {/* Selector de lista elegante */}
          {allLists.length > 0 && (
            <div className="elegant-list-selector" style={{ marginBottom: '24px' }}>
              <div className="selector-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1F2937',
                  margin: 0
                }}>
                  Seleccionar Lista
                </h3>

                <div className="list-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={openShareDialog}
                    disabled={!currentList || loading || isCurrentListShared()}
                    className="elegant-action-btn"
                    title={isCurrentListShared() ? "No puedes compartir una lista compartida" : "Compartir lista"}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: isCurrentListShared() ? 'not-allowed' : 'pointer',
                      opacity: isCurrentListShared() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentListShared()) {
                        e.target.style.backgroundColor = '#F3F4F6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentListShared()) {
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24919 15.0227 5.37061L8.0826 9.84066C7.54305 9.32015 6.80879 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15C6.80879 15 7.54305 14.6798 8.0826 14.1593L15.0227 18.6294C15.0077 18.7508 15 18.8745 15 19C15 20.6569 16.3431 22 18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C17.1912 16 16.4569 16.3202 15.9174 16.8407L8.97727 12.3706C8.99229 12.2492 9 12.1255 9 12C9 11.8745 8.99229 11.7508 8.97727 11.6294L15.9174 7.15934C16.4569 7.67985 17.1912 8 18 8Z"
                        fill={isCurrentListShared() ? "#9CA3AF" : "#3B82F6"}
                      />
                    </svg>
                    Compartir
                  </button>

                  <button
                    onClick={() => {
                      const currentListData = allLists.find(list => list.id === currentList);
                      if (currentListData && isCurrentListOwned()) {
                        setConfirmListDelete(currentListData);
                      }
                    }}
                    disabled={!currentList || loading || !isCurrentListOwned()}
                    className="elegant-action-btn"
                    title={!isCurrentListOwned() ? "Solo el propietario puede eliminar la lista" : "Eliminar lista"}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: !isCurrentListOwned() ? 'not-allowed' : 'pointer',
                      opacity: !isCurrentListOwned() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      color: !isCurrentListOwned() ? '#9CA3AF' : '#EF4444',
                      borderColor: !isCurrentListOwned() ? '#E5E7EB' : '#FECACA'
                    }}
                    onMouseEnter={(e) => {
                      if (isCurrentListOwned()) {
                        e.target.style.backgroundColor = '#FEF2F2';
                        e.target.style.borderColor = '#FECACA';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isCurrentListOwned()) {
                        e.target.style.backgroundColor = 'white';
                        e.target.style.borderColor = '#E5E7EB';
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Eliminar
                  </button>
                </div>
              </div>

              <select
                value={currentList}
                onChange={(e) => setCurrentList(e.target.value)}
                disabled={loading}
                className="elegant-select"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: '#1F2937',
                  backgroundColor: 'white',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" disabled hidden>
                  Selecciona una lista...
                </option>

                <optgroup label="Mis listas">
                  {lists
                    .filter(list => !list.sharedWith || list.sharedWith.length === 0)
                    .map((list, index) => (
                      <option key={`my-${list.id || index}`} value={list.id}>
                        {list.name}
                        {list.isOptimistic && " (guardando...)"}
                      </option>
                    ))}
                </optgroup>

                {lists.filter(list => list.sharedWith && list.sharedWith.length > 0).length > 0 && (
                  <optgroup label="Listas que he compartido">
                    {lists
                      .filter(list => list.sharedWith && list.sharedWith.length > 0)
                      .map((list, index) => (
                        <option key={`shared-by-me-${list.id || index}`} value={list.id}>
                          {list.name} ✓
                        </option>
                      ))}
                  </optgroup>
                )}

                {sharedLists.length > 0 && (
                  <optgroup label="Listas compartidas conmigo">
                    {sharedLists.map((list, index) => (
                      <option key={`shared-with-me-${list.id || index}`} value={list.id}>
                        {list.name} ({list.ownerEmail?.split('@')[0] || 'Usuario'})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Información de la lista actual */}
              {currentList && (
                <div className="current-list-info" style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0'
                }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: isCurrentListShared() ? '#3B82F6' :
                      isCurrentListSharedByMe() ? '#10B981' : '#1F2937',
                    margin: '0 0 8px 0'
                  }}>
                    {getCurrentListName()}
                    {isCurrentListShared() && (
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#6B7280',
                        marginLeft: '8px'
                      }}>
                        (Compartida conmigo)
                      </span>
                    )}
                    {isCurrentListSharedByMe() && (
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#10B981',
                        marginLeft: '8px'
                      }}>
                        (Compartida por mí)
                      </span>
                    )}
                  </h4>

                  {/* Sección de Información de la Lista */}
                  <ListInfoSection />
                </div>
              )}
            </div>
          )}

          {!allLists.length && (
            <div className="elegant-empty-state" style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#6B7280'
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>No tienes listas creadas</h3>
              <p style={{ fontSize: '16px' }}>Crea tu primera lista para empezar a organizar tus compras</p>
            </div>
          )}

          {/* Sección de items */}
          {currentList && (
            <div className="elegant-items-section">
              <div className="section-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1F2937',
                  margin: 0
                }}>
                  Productos {isCurrentListShared() && "(Lista compartida)"}
                </h3>

                {items.length > 0 && (
                  <div className="items-stats" style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    backgroundColor: '#F3F4F6',
                    padding: '4px 12px',
                    borderRadius: '20px'
                  }}>
                    {pendingItems.length} pendientes • {completedItems.length} comprados
                  </div>
                )}
              </div>

              {/* Añadir items elegante */}
              <ElegantItemAdder />

              {/* Lista de items */}
              {items.length > 0 ? (
                <div className="elegant-items-container">
                  {/* Items pendientes agrupados por categoría */}
                  {Object.keys(groupedPendingItems).map(category => {
                    const categoryInfo = getCategoryInfo(category);
                    return (
                      <div key={`category-${category}`} className="category-section">
                        <div className="category-header" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          backgroundColor: `${categoryInfo.color}15`,
                          borderLeft: `4px solid ${categoryInfo.color}`,
                          borderRadius: '8px',
                          margin: '16px 0 8px 0',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{
                            fontSize: '18px',
                            flexShrink: 0
                          }}>
                            {categoryInfo.icon}
                          </span>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: categoryInfo.color,
                            margin: 0,
                            flex: '1 1 auto',
                            minWidth: '120px'
                          }}>
                            {categoryInfo.name}
                          </h4>
                          <span style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            flexShrink: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}>
                            {groupedPendingItems[category].length} {groupedPendingItems[category].length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <ul className="elegant-items-list" style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          {groupedPendingItems[category].map(item => (
                            <ElegantItem key={item.id} item={item} />
                          ))}
                        </ul>
                      </div>
                    );
                  })}

                  {/* Sección de COMPRADO */}
                  {completedItems.length > 0 && (
                    <div className="completed-section">
                      <div className="category-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        backgroundColor: '#10B98115',
                        borderLeft: '4px solid #10B981',
                        borderRadius: '8px',
                        margin: '24px 0 8px 0',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          fontSize: '18px',
                          flexShrink: 0
                        }}>
                        </span>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#10B981',
                          margin: 0,
                          flex: '1 1 auto',
                          minWidth: '120px'
                        }}>
                          Comprado
                        </h4>
                      </div>
                      <ul className="elegant-items-list" style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {completedItems.map(item => (
                          <ElegantItem key={item.id} item={item} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="elegant-empty-items" style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6B7280',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '200px'
                }}>
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      marginBottom: '16px',
                      opacity: 0.5
                    }}
                  >
                    <path
                      d="M3 10H21M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#374151'
                  }}>
                    No hay productos en esta lista
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    maxWidth: '300px',
                    lineHeight: '1.5'
                  }}>
                    Añade algunos productos usando el formulario de arriba
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {/* Modal de Compartir */}
      {shareDialogOpen && (
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>Compartir lista</h3>
              <button
                onClick={() => {
                  setShareDialogOpen(false);
                  setEmailValidation({ valid: true, message: "" });
                  setEmailToShare("");
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              {/* Mensaje de validación */}
              {emailValidation.message && (
                <div
                  className={`validation-message ${emailValidation.valid ? 'success' : 'error'}`}
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    marginBottom: "15px",
                    backgroundColor: emailValidation.valid ? "#e8f5e8" : "#ffebee",
                    color: emailValidation.valid ? "#2e7d32" : "#c62828",
                    border: `1px solid ${emailValidation.valid ? "#c8e6c9" : "#ffcdd2"}`
                  }}
                >
                  {emailValidation.message}
                </div>
              )}

              <div className="share-input">
                <input
                  type="email"
                  value={emailToShare}
                  onChange={(e) => {
                    setEmailToShare(e.target.value);
                    if (!emailValidation.valid) {
                      setEmailValidation({ valid: true, message: "" });
                    }
                  }}
                  placeholder="Introduce el email del usuario"
                  className="elegant-input"
                  style={{
                    color: "black",
                    borderColor: emailValidation.valid ? "#e2e8f0" : "#c62828"
                  }}
                  disabled={loading}
                />
                <button
                  onClick={shareList}
                  disabled={loading || !emailToShare.trim()}
                  className="blue-button"
                  style={{
                    backgroundColor: "#1e88e5",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? "Comprobando..." : "Compartir"}
                </button>
              </div>

              {/* Información adicional */}
              <div className="share-info" style={{ marginTop: "15px", fontSize: "0.9rem", color: "#666" }}>
                <p>• El usuario debe tener una cuenta en BuyNote</p>
                <p>• Podrá ver y modificar los productos de la lista</p>
              </div>

              {sharedUsers.length > 0 && (
                <div className="shared-users">
                  <h4 style={{ color: "black", marginTop: "20px" }}>Compartido con:</h4>
                  <ul>
                    {sharedUsers.map((email, index) => (
                      <li key={`shared-${email || index}`} style={{ color: "black" }}>
                        <span>{email}</span>
                        <button
                          onClick={() => {
                            setUserToUnshare(email);
                            setUnshareDialogOpen(true);
                            setShareDialogOpen(false);
                          }}
                          className="unshare-btn"
                          disabled={loading}
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="dialog-buttons">
              <button
                onClick={() => {
                  setShareDialogOpen(false);
                  setEmailValidation({ valid: true, message: "" });
                  setEmailToShare("");
                }}
                className="cancel-btn"
                style={{ color: "black" }}
                disabled={loading}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Dejar de Compartir */}
      {unshareDialogOpen && (
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>Dejar de compartir</h3>
              <button
                onClick={() => {
                  setUnshareDialogOpen(false);
                  setShareDialogOpen(true);
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              <p style={{ color: "black" }}>¿Dejar de compartir la lista con {userToUnshare}?</p>
            </div>

            <div className="dialog-buttons">
              <button
                onClick={() => {
                  setUnshareDialogOpen(false);
                  setShareDialogOpen(true);
                }}
                className="cancel-btn"
                style={{ color: "black" }}
              >
                Cancelar
              </button>
              <button
                onClick={unshareList}
                disabled={loading}
                className="confirm-delete-btn"
                style={{ backgroundColor: "red" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Item */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>Confirmar eliminación</h3>
              <button
                onClick={() => setConfirmDelete(null)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              <p style={{ color: "black" }}>¿Eliminar "{confirmDelete.text}"?</p>
            </div>

            <div className="dialog-buttons">
              <button
                onClick={() => setConfirmDelete(null)}
                className="cancel-btn"
                style={{ color: "black" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteItem(confirmDelete.id)}
                className="confirm-delete-btn"
                style={{ backgroundColor: "red" }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Lista */}
      {confirmListDelete && (
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>Confirmar eliminación</h3>
              <button
                onClick={() => setConfirmListDelete(null)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              <p style={{ color: "black" }}>¿Eliminar la lista "{confirmListDelete.name}" y todos sus productos?</p>
            </div>

            <div className="dialog-buttons">
              <button
                onClick={() => setConfirmListDelete(null)}
                className="cancel-btn"
                style={{ color: "black" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteList(confirmListDelete.id);
                }}
                className="confirm-delete-btn"
                style={{ backgroundColor: "red" }}
                disabled={loading}
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Observaciones */}
      {observationsDialogOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="dialog-modal" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="dialog-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px 0',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: 0,
              background: 'white'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Observaciones - {allLists.find(list => list.id === currentList)?.name || "Lista actual"}
              </h3>
              <button
                onClick={() => {
                  setObservationsDialogOpen(false);
                  setEditingObservations(false);
                }}
                className="close-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  lineHeight: 1,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>

            <div className="dialog-content" style={{
              padding: '24px',
              flex: 1,
              overflowY: 'auto',
              background: 'white'
            }}>
              <textarea
                value={editingObservations ? (listObservations[currentList] || "") : (listObservations[currentList] || "")}
                onChange={(e) => !editingObservations ? null : setListObservations(prev => ({ ...prev, [currentList]: e.target.value }))}
                placeholder="Añade observaciones sobre esta lista..."
                rows="6"
                disabled={!editingObservations}
                className="elegant-textarea"
                style={{
                  color: 'black',
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical',
                  minHeight: '120px',
                  backgroundColor: editingObservations ? 'white' : '#f9fafb'
                }}
              />
            </div>

            <div className="dialog-buttons" style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              padding: '0 24px 24px',
              flexWrap: 'wrap',
              background: 'white'
            }}>
              {!editingObservations ? (
                <>
                  <button
                    onClick={() => setObservationsDialogOpen(false)}
                    className="cancel-btn"
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      minWidth: '80px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e5e7eb';
                      e.target.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => setEditingObservations(true)}
                    className="blue-button"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      minWidth: '80px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    Editar
                  </button>
                  {listObservations[currentList] && (
                    <button
                      onClick={() => {
                        saveListObservations(currentList, "");
                        setEditingObservations(false);
                      }}
                      className="cancel-btn"
                      style={{
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #d1d5db',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        minWidth: '80px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#e5e7eb';
                        e.target.style.borderColor = '#9ca3af';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#f3f4f6';
                        e.target.style.borderColor = '#d1d5db';
                      }}
                    >
                      Limpiar
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setObservationsDialogOpen(false);
                      setEditingObservations(false);
                    }}
                    className="cancel-btn"
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      minWidth: '80px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e5e7eb';
                      e.target.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      saveListObservations(currentList, listObservations[currentList] || "");
                      setEditingObservations(false);
                    }}
                    className="blue-button"
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      minWidth: '80px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#3b82f6';
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      saveListObservations(currentList, "");
                      setListObservations(prev => ({ ...prev, [currentList]: "" }));
                      setEditingObservations(false);
                    }}
                    className="cancel-btn"
                    style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      minWidth: '80px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#e5e7eb';
                      e.target.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f3f4f6';
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  >
                    Limpiar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {finalizeDialogOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="dialog-modal" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="dialog-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px 0',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: 0,
              background: 'white'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Finalizar Compra
              </h3>
              <button
                onClick={() => setFinalizeDialogOpen(false)}
                className="close-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  lineHeight: 1,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>

            <div className="dialog-content" style={{
              padding: '24px',
              flex: 1,
              overflowY: 'auto',
              background: 'white'
            }}>
              <p style={{ color: 'black', marginBottom: '16px' }}>
                Introduce el precio total de la compra:
              </p>
              <input
                type="number"
                step="0.01"
                value={purchaseInfo[currentList]?.totalPrice?.toString() || ""}
                onChange={(e) => {
                  const price = e.target.value;
                  setPurchaseInfo(prev => ({
                    ...prev,
                    [currentList]: price ? { totalPrice: parseFloat(price) } : null
                  }));
                }}
                placeholder="Precio total (ej: 45.50)"
                className="elegant-input"
                style={{
                  color: 'grey',
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div className="dialog-buttons" style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              padding: '0 24px 24px',
              flexWrap: 'wrap',
              background: 'white'
            }}>
              <button
                onClick={() => setFinalizeDialogOpen(false)}
                className="cancel-btn"
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  minWidth: '80px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const price = purchaseInfo[currentList]?.totalPrice;
                  finalizePurchase(currentList, price);
                  setFinalizeDialogOpen(false);
                }}
                className="blue-button"
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  minWidth: '80px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                }}
              >
                {purchaseInfo[currentList]?.totalPrice ? 'Guardar' : 'Eliminar Precio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {splitDialogOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="dialog-modal" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="dialog-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px 0',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: 0,
              background: 'white'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                División de Gastos
              </h3>
              <button
                onClick={() => setSplitDialogOpen(false)}
                className="close-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  lineHeight: 1,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>

            <div className="dialog-content" style={{
              padding: '24px',
              flex: 1,
              overflowY: 'auto',
              background: 'white'
            }}>
              {(() => {
                const totalPrice = purchaseInfo[currentList]?.totalPrice ||
                  Object.values(itemPrices[currentList] || {}).reduce((sum, price) => sum + price.amount, 0);
                const participants = [auth.currentUser?.email || "Tú", ...(allLists.find(list => list.id === currentList)?.sharedWith || [])];

                if (!totalPrice || totalPrice === 0) {
                  return (
                    <p style={{ color: 'black' }}>
                      Primero establece el precio total de la compra usando 'Finalizar Compra'
                    </p>
                  );
                }

                const sharePerPerson = totalPrice / participants.length;

                return (
                  <div className="split-result" style={{
                    backgroundColor: '#f8fafc',
                    padding: '20px',
                    borderRadius: '8px',
                    margin: '16px 0'
                  }}>
                    <p style={{ color: 'black', marginBottom: '8px' }}>
                      <strong>Total:</strong> {totalPrice.toFixed(2)} €
                    </p>
                    <p style={{ color: 'black', marginBottom: '8px' }}>
                      <strong>Personas:</strong> {participants.length}
                    </p>
                    <p style={{ color: 'black', marginBottom: '16px' }}>
                      <strong>Por persona:</strong> {sharePerPerson.toFixed(2)} €
                    </p>
                    <div className="participants-list">
                      {participants.map((participant, index) => (
                        <div
                          key={index}
                          className="participant"
                          style={{
                            color: 'black',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <span>{participant}</span>
                          <strong>{sharePerPerson.toFixed(2)} €</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="dialog-buttons" style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              padding: '0 24px 24px',
              flexWrap: 'wrap',
              background: 'white'
            }}>
              <button
                onClick={() => setSplitDialogOpen(false)}
                className="cancel-btn"
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  minWidth: '80px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const totalPrice = purchaseInfo[currentList]?.totalPrice ||
                    Object.values(itemPrices[currentList] || {}).reduce((sum, price) => sum + price.amount, 0);
                  const participants = [auth.currentUser?.email || "Tú", ...(allLists.find(list => list.id === currentList)?.sharedWith || [])];
                  splitExpenses(totalPrice, participants);
                }}
                className="blue-button"
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  minWidth: '80px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                }}
              >
                Calcular
              </button>
              <button
                onClick={() => {
                  const totalPrice = purchaseInfo[currentList]?.totalPrice ||
                    Object.values(itemPrices[currentList] || {}).reduce((sum, price) => sum + price.amount, 0);
                  const participants = [auth.currentUser?.email || "Tú", ...(allLists.find(list => list.id === currentList)?.sharedWith || [])];
                  const sharePerPerson = totalPrice / participants.length;
                  const result = `Resumen de Gastos\n\nTotal gastado: ${totalPrice.toFixed(2)} €\nNúmero de personas: ${participants.length}\nPrecio por persona: ${sharePerPerson.toFixed(2)} €\n\n${participants.map((p, i) => `${i + 1}. ${p}: ${sharePerPerson.toFixed(2)} €`).join('\n')}`;

                  navigator.clipboard.writeText(result);
                  showToast("Resumen copiado al portapapeles", 'success');
                }}
                className="blue-button"
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  minWidth: '80px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#10b981';
                }}
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :root {
          --primary-blue: #1e88e5;
          --dark-blue: #0d47a1;
          --light-blue: #bbdefb;
          --white: #ffffff;
          --gray: #f5f5f5;
          --dark-gray: #424242; 
          --text-color: #000000;
          --completed-item: #f5f5f5;
          --error-red: #c62828;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        html, body {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          height: 100%;
        }
        
        .elegant-app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #F3F4F6;
        }
        
        .elegant-navbar {
          background-color: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 16px 0;
          margin-bottom: 24px;
          width: 100%;
        }
        
        .navbar-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .app-name {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--primary-blue);
        }
        
        .elegant-main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          width: 100%;
        }
        
        .elegant-content-card {
          background-color: var(--white);
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e0e0e0;
          margin: 0 auto;
          width: 100%;
        }
        
        .elegant-list-creator {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          padding: 16px;
          background-color: #F8FAFC;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          flex-wrap: wrap;
        }
        
        .elegant-input {
          flex: 1;
          padding: 12px 15px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background-color: var(--white);
          color: var(--text-color);
          min-width: 200px;
        }

        .elegant-input {
          color: var(--text-color);
        }

        .elegant-input::placeholder {
          color: var(--dark-gray);
          opacity: 1;
        }

        .elegant-select {
          color: var(--text-color);
        }

        .no-lists-message {
          color: var(--dark-gray);
        }

        .shared-users h4 {
          color: var(--dark-gray);
        }

        .strikethrough {
          color: var(--dark-gray);
        }

        body, p, h1, h2, h3, h4, h5, h6, span, div {
          color: var(--text-color);
        }

        .secondary-text {
          color: var(--dark-gray);
        }
        
        .elegant-input:focus {
          outline: none;
          border-color: var(--primary-blue);
          box-shadow: 0 0 0 3px rgba(30, 136, 229, 0.1);
        }
        
        .elegant-create-btn, .elegant-add-btn {
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-size: 16px;
          font-weight: 600;
          gap: 8px;
          white-space: nowrap;
        }
        
        .elegant-create-btn:hover, .elegant-add-btn:hover {
          transform: translateY(-1px);
        }
        
        .elegant-create-btn:disabled, .elegant-add-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .elegant-list-selector {
          margin-bottom: 20px;
          width: 100%;
        }
        
        .selector-header {
          display: flex;
          gap: 10px;
          align-items: center;
          width: 100%;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        
        .elegant-select {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          background-color: var(--white);
          color: var(--text-color);
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 1em;
        }
        
        .list-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .elegant-action-btn {
          background: #f0f0f0;
          border: 1px solid #e0e0e0;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
        }
        
        .elegant-action-btn:hover {
          background-color: #e0e0e0;
        }

        .optimistic-item {
          color: #888;
          font-style: italic;
        }

        .optimistic-item:disabled {
          background-color: #f5f5f5;
        }
        
        .elegant-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .elegant-empty-state {
          text-align: center;
          color: var(--dark-gray);
          margin: 20px 0;
          padding: 40px 20px;
        }
        
        .elegant-items-section {
          margin-top: 20px;
          width: 100%;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .items-stats {
          font-size: 14px;
          color: #6B7280;
          background-color: #F3F4F6;
          padding: 4px 12px;
          border-radius: 20px;
        }
        
        .elegant-item-adder {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          width: 100%;
          flex-wrap: wrap;
        }
        
        .elegant-items-list {
          list-style: none;
          width: 100%;
          padding: 0;
          margin: 0;
        }
        
        .category-header {
          padding: 12px 16px;
          border-radius: 8px;
          margin: 16px 0 8px 0;
          font-weight: bold;
          color: var(--text-color);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .elegant-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background-color: var(--white);
          border-radius: 12px;
          margin-bottom: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-left: 4px solid;
          transition: all 0.3s ease;
          width: 100%;
          flex-wrap: wrap;
        }
        
        .elegant-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .item-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          flex-wrap: wrap;
        }
        
        .elegant-checkbox {
          min-width: 20px;
          min-height: 20px;
          cursor: pointer;
          accent-color: #10B981;
          flex-shrink: 0;
        }
        
        .item-text {
          flex: 1;
          color: var(--text-color);
          font-size: 1rem;
          min-width: 0;
        }
        
        .item-metadata {
          font-size: 12px;
          color: #6B7280;
          margin-top: 4px;
        }
        
        .item-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        
        .item-price {
          background-color: #10B981;
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
        }
        
        .elegant-delete-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .elegant-delete-btn:hover {
          background-color: #FEF2F2;
        }
        
        .elegant-delete-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .blue-button {
          background-color: var(--primary-blue);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .blue-button:hover {
          background-color: var(--dark-blue);
        }
        
        .blue-button:disabled {
          background-color: var(--dark-gray);
          cursor: not-allowed;
        }

        .optimistic-operation {
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }

        .shared-list {
          border-left: 3px solid #1e88e5;
          padding-left: 8px;
        }
        
      /* ===== ESTILOS PARA MODALES CENTRADOS ===== */
      .modal-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background-color: rgba(0, 0, 0, 0.6) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 9999 !important;
        padding: 20px;
        animation: fadeIn 0.2s ease-out;
      }

      .dialog-modal {
        background: white !important;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease-out;
        overflow: hidden;
        position: relative;
        z-index: 10000;
        margin: auto;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px 0;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 0;
        background: white;
      }

      .dialog-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
        lineHeight: 1;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        background-color: #f3f4f6;
        color: #374151;
      }

      .dialog-content {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
        background: white;
      }

      .dialog-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 0 24px 24px;
        flex-wrap: wrap;
        background: white;
      }

      /* Botones de los modales */
      .cancel-btn {
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        min-width: 80px;
      }

      .cancel-btn:hover {
        background-color: #e5e7eb;
        border-color: #9ca3af;
      }

      .confirm-delete-btn {
        background-color: #dc2626;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        min-width: 80px;
      }

      .confirm-delete-btn:hover {
        background-color: #b91c1c;
      }

      .confirm-delete-btn:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
      }

      /* Campos de formulario en modales */
      .elegant-input, .elegant-textarea {
        background-color: white !important;
        color: #1f2937;
      }

      .elegant-input:focus, .elegant-textarea:focus {
        background-color: white !important;
      }

      /* Estilos específicos para el modal de compartir */
      .share-input {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }

      .share-input .elegant-input {
        flex: 1;
        min-width: 200px;
      }

      .share-info {
        background-color: #f8fafc;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid #3b82f6;
        margin: 16px 0;
      }

      .share-info p {
        margin: 4px 0;
        font-size: 0.9rem;
        color: #4b5563;
      }

      .shared-users {
        margin-top: 20px;
      }

      .shared-users h4 {
        margin: 0 0 12px 0;
        font-size: 1rem;
        color: #374151;
      }

      .shared-users ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .shared-users li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 8px;
      }

      .shared-users li:last-child {
        border-bottom: none;
      }

      .unshare-btn {
        background-color: #ef4444;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .unshare-btn:hover {
        background-color: #dc2626;
      }

      .unshare-btn:disabled {
        background-color: #9ca3af;
        cursor: not-allowed;
      }

      /* Estilos para división de gastos */
      .split-result {
        background-color: #f8fafc;
        padding: 20px;
        border-radius: 8px;
        margin: 16px 0;
      }

      .split-result p {
        margin: 8px 0;
        color: #374151;
      }

      .participants-list {
        margin-top: 16px;
      }

      .participant {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
        flex-wrap: wrap;
      }

      .participant:last-child {
        border-bottom: none;
      }

      /* Mensajes de validación */
      .validation-message {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 0.9rem;
      }

      .validation-message.success {
        background-color: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }

      .validation-message.error {
        background-color: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }

      /* Animaciones */
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .elegant-spinner {
        animation: spin 1s linear infinite;
      }

      /* Responsive para modales */
      @media (max-width: 640px) {
        .modal-overlay {
          padding: 10px;
        }
        
        .dialog-modal {
          max-width: 100%;
          max-height: 95vh;
        }
        
        .dialog-header {
          padding: 16px 20px 0;
        }
        
        .dialog-content {
          padding: 20px;
        }
        
        .dialog-buttons {
          padding: 0 20px 20px;
          flex-direction: column;
        }
        
        .dialog-buttons button {
          width: 100%;
        }
        
        .share-input {
          flex-direction: column;
        }
        
        .close-btn {
          width: 28px;
          height: 28px;
          font-size: 1.25rem;
        }

        .elegant-list-creator {
          flex-direction: column;
        }

        .elegant-item-adder {
          flex-direction: column;
        }

        .selector-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .list-actions {
          width: 100%;
          justify-content: flex-start;
        }

        .section-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .item-content {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .item-actions {
          width: 100%;
          justify-content: flex-end;
          margin-top: 8px;
        }
      }

      /* Scroll personalizado para modales */
      .dialog-content::-webkit-scrollbar {
        width: 6px;
      }

      .dialog-content::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      .dialog-content::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }

      .dialog-content::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }

      /* Estilos adicionales para la sección de información de lista */
        .list-info-section {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid #e9ecef;
        }

        .list-info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .list-info-header h4 {
          margin: 0;
          color: #495057;
          font-size: 1.1rem;
        }

        .list-info-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .list-info-actions .action-btn {
          background: none;
          border: 1px solid #dee2e6;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.2rem;
          transition: all 0.2s;
        }

        .list-info-actions .action-btn:hover {
          background-color: #e9ecef;
        }

        .price-info {
          margin-bottom: 10px;
          font-size: 1rem;
        }

        .extra-info, .observations-preview {
          margin-top: 10px;
          padding: 10px;
          background-color: white;
          border-radius: 6px;
          border-left: 4px solid #007bff;
        }

        .extra-info p, .observations-preview p {
          margin: 5px 0 0 0;
          color: #6c757d;
          font-size: 0.9rem;
        }

        .purchaser-info, .added-by-info {
          display: block;
          margin-top: 2px;
        }

        .price-tag {
          background-color: #e7f3ff;
          color: #0066cc;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .price-btn {
          background: none;
          border: 1px solid #28a745;
          color: #28a745;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .price-btn:hover {
          background-color: #28a745;
          color: white;
        }

        /* Responsive adicional */
        @media (max-width: 480px) {
          .elegant-content-card {
            padding: 16px;
          }
          
          .navbar-content {
            flex-direction: column;
            gap: 12px;
          }
          
          .elegant-navbar {
            padding: 12px 0;
          }
          
          .elegant-main-content {
            padding: 0 16px;
          }
        }

        @media (max-width: 768px) {
          .category-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .category-header span:last-child {
            margin-left: 0;
          }
        }
`}</style>
    </div>
  );
}
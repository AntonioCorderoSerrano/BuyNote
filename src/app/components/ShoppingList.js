import React from 'react';
import { useState, useEffect, useRef, useCallback } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, writeBatch, getDocs, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

export function ShoppingList() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [lists, setLists] = useState([]);
  const [sharedLists, setSharedLists] = useState([]);
  const [currentList, setCurrentList] = useState("");
  const [newListName, setNewListName] = useState("");
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
  const [extraInfoDialogOpen, setExtraInfoDialogOpen] = useState(false);
  const [editingObservations, setEditingObservations] = useState(false);

  const allLists = [...lists, ...sharedLists];
  const scannerRef = useRef(null);
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
      const categoryInfo = getCategoryInfo(detectedCategory);

      const newItemObj = {
        id: tempId,
        text: itemText.trim(),
        listId: currentList,
        userId: auth.currentUser.uid,
        addedBy: auth.currentUser.email,
        completed: false,
        category: detectedCategory,
        categoryColor: categoryInfo.color,
        categoryIcon: categoryInfo.icon,
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
          categoryColor: newItemObj.categoryColor,
          categoryIcon: newItemObj.categoryIcon,
          createdAt: new Date()
        });

        // Reemplazar item temporal con el real
        setItems(prev => prev.map(item =>
          item.id === tempId
            ? { ...item, id: docRef.id, isOptimistic: false }
            : item
        ));
      }

      return newItemObj.id;
    } catch (err) {
      console.error("Error añadiendo producto:", err);
      // Revertir actualización optimista
      setItems(prev => prev.filter(item => item.id !== tempId));
      throw err;
    }
  };

  // Función toggleItemCompletion mejorada
  const toggleItemCompletion = async (itemId, currentStatus) => {
    if (!itemId || itemId.startsWith('temp-')) {
      console.log('ID de item no válido:', itemId);
      return;
    }

    try {
      const currentItem = items.find(item => item.id === itemId);
      if (!currentItem) {
        console.log('Item no encontrado:', itemId);
        return;
      }

      const updates = {
        completed: !currentStatus
      };

      if (!currentStatus) {
        updates.purchasedBy = auth.currentUser?.email || "";
        updates.purchasedAt = new Date();
        updates.category = "COMPRADO";
        updates.categoryColor = CATEGORIES.COMPRADO.color;
        updates.categoryIcon = CATEGORIES.COMPRADO.icon;
      } else {
        updates.purchasedBy = "";
        updates.purchasedAt = null;
        const originalCategory = detectCategory(currentItem.text);
        const categoryInfo = getCategoryInfo(originalCategory);
        updates.category = originalCategory;
        updates.categoryColor = categoryInfo.color;
        updates.categoryIcon = categoryInfo.icon;
      }

      // Actualizar estado local
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? {
            ...item,
            ...updates
          }
          : item
      ));

      // Actualizar Firebase
      if (itemId && !itemId.startsWith('temp-')) {
        const itemRef = doc(db, "items", itemId);
        await updateDoc(itemRef, updates);
      }

    } catch (err) {
      console.error("Error actualizando item:", err);
      // Revertir en caso de error
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, completed: currentStatus }
          : item
      ));
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
    } catch (error) {
      console.error("Error guardando observaciones:", error);
      alert("Error al guardar observaciones: " + error.message);
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
          [listId]: data.extraInfo || ""
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

        alert(`Precio guardado: ${totalPrice} €`);
      } else {
        await updateDoc(doc(db, "lists", listId), {
          purchaseInfo: null
        });

        setPurchaseInfo(prev => ({
          ...prev,
          [listId]: null
        }));

        alert("Precio eliminado");
      }
    } catch (error) {
      console.error("Error finalizando compra:", error);
      alert("Error al guardar precio: " + error.message);
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

    if (window.confirm(result + "\n\n¿Quieres copiar al portapapeles?")) {
      navigator.clipboard.writeText(result);
      alert("Copiado al portapapeles");
    }
  };

  // Guardar información adicional
  const saveExtraInfo = async (listId, info) => {
    try {
      await updateDoc(doc(db, "lists", listId), {
        extraInfo: info
      });

      setExtraInfo(prev => ({
        ...prev,
        [listId]: info
      }));

      alert("Información guardada");
    } catch (error) {
      console.error("Error guardando información adicional:", error);
      alert("Error al guardar información: " + error.message);
    }
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
      }
    } catch (error) {
      console.error("Error guardando precio de item:", error);
      alert("Error al guardar precio: " + error.message);
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

  // Efecto para items - CORREGIDO
  useEffect(() => {
    if (!currentList) {
      setItems([]);
      return;
    }

    const q = query(
      collection(db, "items"),
      where("listId", "==", currentList)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isOptimistic: false
      }));

      // Combinar items de Firebase con items optimistas locales
      const optimisticItems = items.filter(item => item.isOptimistic && item.listId === currentList);
      const combinedItems = [...optimisticItems, ...updatedItems];

      itemsCache.current = {
        ...itemsCache.current,
        [currentList]: combinedItems
      };

      setItems(combinedItems);
    });

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
    }
  };

  // Handler para Enter key - CORREGIDO
  const handleKeyPress = (e, type, value, setValue, handler) => {
    if (e.key === 'Enter' && value.trim()) {
      handler(value);
      setValue(""); // Limpiar input después de enviar
    }
  };

  const deleteItem = async (id) => {
    try {
      setLoading(true);

      if (id && !id.startsWith('temp-')) {
        await deleteDoc(doc(db, "items", id));

        try {
          await deleteDoc(doc(db, "itemPrices", id));
        } catch (priceError) {
          console.log("No se encontró precio para eliminar:", priceError);
        }
      }

      setItems(prev => prev.filter(item => item.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Error borrando producto:", err);
      alert("No tienes permiso para borrar este producto");
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

      const itemsQuery = query(collection(db, "items"), where("listId", "==", listId));
      const itemsSnapshot = await getDocs(itemsQuery);

      itemsSnapshot.forEach((itemDoc) => {
        batch.delete(doc(db, "items", itemDoc.id));
        batch.delete(doc(db, "itemPrices", itemDoc.id));
      });

      batch.delete(doc(db, "listObservations", listId));
      batch.delete(doc(db, "lists", listId));
      await batch.commit();

      setConfirmListDelete(null);

      if (currentList === listId) {
        setCurrentList("");
      }
    } catch (err) {
      console.error("Error eliminando lista:", err);
      setError(`Error al eliminar: ${err.message}`);
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
    } catch (err) {
      console.error("Error eliminando compartido:", err);
      setSharedUsers([...sharedUsers, userToUnshare]);
      setError(`Error al eliminar compartido: ${err.message}`);
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

  const isCurrentListShared = () => {
    return sharedLists.some(list => list.id === currentList);
  };

  const isCurrentListOwned = () => {
    return lists.some(list => list.id === currentList);
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
    } finally {
      setLoading(false);
    }
  };

  // Componente para la sección de información de la lista
  const ListInfoSection = () => {
    if (!currentList) return null;

    const currentPurchaseInfo = purchaseInfo[currentList];
    const currentExtraInfo = extraInfo[currentList];
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
            <button
              onClick={() => setExtraInfoDialogOpen(true)}
              className="action-btn"
              title="Información Adicional"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                cursor: "pointer"
              }}
            >
              ℹ️
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
    const categoryInfo = getCategoryInfo(item.category);

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
              cursor: 'pointer'
            }}
            disabled={loading}
          />

          <span
            className="item-text"
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: item.completed ? '#9CA3AF' : '#374151',
              textDecoration: item.completed ? 'line-through' : 'none',
              flex: 1
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

          <button
            onClick={() => setConfirmDelete(item)}
            disabled={loading || item.isOptimistic}
            className="elegant-delete-btn"
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: item.isOptimistic ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              opacity: loading || item.isOptimistic ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!item.isOptimistic) e.target.style.backgroundColor = '#FEF2F2';
            }}
            onMouseLeave={(e) => {
              if (!item.isOptimistic) e.target.style.backgroundColor = 'transparent';
            }}
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
        gap: '12px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#F8FAFC',
        borderRadius: '12px',
        border: '1px solid #E2E8F0'
      }}>
        <input
          value={localListName}
          onChange={(e) => setLocalListName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nombre de nueva lista..."
          className="elegant-input"
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: '16px',
            color: '#1F2937',
            backgroundColor: 'white',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
        />
        <button
          onClick={handleCreate}
          disabled={loading || !localListName.trim()}
          className="elegant-create-btn"
          style={{
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
            gap: '8px'
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
          Crear Lista
        </button>
      </div>
    );
  };

  // Componente elegante para añadir items - CORREGIDO
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
        gap: '12px',
        marginBottom: '20px'
      }}>
        <input
          value={localItem}
          onChange={(e) => setLocalItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Añadir nuevo producto..."
          className="elegant-input"
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: '16px',
            color: '#1F2937',
            backgroundColor: 'white',
            outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
          onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
        />
        <button
          onClick={handleAdd}
          disabled={!localItem.trim()}
          className="elegant-add-btn"
          style={{
            padding: '12px 16px',
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
            gap: '8px'
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
          Añadir
        </button>
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
          justifyContent: 'space-between'
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
                transition: 'all 0.2s'
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
                marginBottom: '16px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1F2937',
                  margin: 0
                }}>
                  Seleccionar Lista
                </h3>

                <div className="list-actions" style={{ display: 'flex', gap: '8px' }}>
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
                marginBottom: '20px'
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
                          margin: '16px 0 8px 0'
                        }}>
                          <span style={{ fontSize: '18px' }}>{categoryInfo.icon}</span>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: categoryInfo.color,
                            margin: 0
                          }}>
                            {categoryInfo.name}
                          </h4>
                          <span style={{
                            fontSize: '14px',
                            color: '#6B7280',
                            marginLeft: 'auto'
                          }}>
                            {groupedPendingItems[category].length} items
                          </span>
                        </div>
                        <ul className="elegant-items-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
                        margin: '24px 0 8px 0'
                      }}>
                        <span style={{ fontSize: '18px' }}>✅</span>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#10B981',
                          margin: 0
                        }}>
                          Comprado
                        </h4>
                        <span style={{
                          fontSize: '14px',
                          color: '#6B7280',
                          marginLeft: 'auto'
                        }}>
                          {completedItems.length} items
                        </span>
                      </div>
                      <ul className="elegant-items-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
                  color: '#6B7280'
                }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px', opacity: 0.5 }}>
                    <path d="M3 10H21M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No hay productos en esta lista</h3>
                  <p style={{ fontSize: '14px' }}>Añade algunos productos usando el formulario de arriba</p>
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
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>Observaciones - {allLists.find(list => list.id === currentList)?.name || "Lista actual"}</h3>
              <button
                onClick={() => setObservationsDialogOpen(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              <textarea
                value={editingObservations ? (listObservations[currentList] || "") : (listObservations[currentList] || "")}
                onChange={(e) => !editingObservations ? null : setListObservations(prev => ({ ...prev, [currentList]: e.target.value }))}
                placeholder="Añade observaciones sobre esta lista..."
                rows="6"
                disabled={!editingObservations}
                className="elegant-textarea"
                style={{ color: "black", width: "100%" }}
              />
            </div>

            <div className="dialog-buttons">
              {!editingObservations ? (
                <>
                  <button onClick={() => setObservationsDialogOpen(false)} className="cancel-btn" style={{ color: "black" }}>
                    Cerrar
                  </button>
                  <button onClick={() => setEditingObservations(true)} className="blue-button">
                    Editar
                  </button>
                  {listObservations[currentList] && (
                    <button
                      onClick={() => {
                        saveListObservations(currentList, "");
                        setEditingObservations(false);
                      }}
                      className="cancel-btn"
                      style={{ color: "black" }}
                    >
                      Limpiar
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => setObservationsDialogOpen(false)} className="cancel-btn" style={{ color: "black" }}>
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      saveListObservations(currentList, listObservations[currentList] || "");
                      setEditingObservations(false);
                    }}
                    className="blue-button"
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
                    style={{ color: "black" }}
                  >
                    Limpiar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalizar Compra */}
      {finalizeDialogOpen && (
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>Finalizar Compra</h3>
              <button
                onClick={() => setFinalizeDialogOpen(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              <p style={{ color: "black" }}>Introduce el precio total de la compra:</p>
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
                style={{ color: "black", width: "100%" }}
              />
            </div>

            <div className="dialog-buttons">
              <button onClick={() => setFinalizeDialogOpen(false)} className="cancel-btn" style={{ color: "black" }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  const price = purchaseInfo[currentList]?.totalPrice;
                  finalizePurchase(currentList, price);
                  setFinalizeDialogOpen(false);
                }}
                className="blue-button"
              >
                {purchaseInfo[currentList]?.totalPrice ? "Guardar" : "Eliminar Precio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Dividir Gastos */}
      {splitDialogOpen && (
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>División de Gastos</h3>
              <button
                onClick={() => setSplitDialogOpen(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              {(() => {
                const totalPrice = purchaseInfo[currentList]?.totalPrice ||
                  Object.values(itemPrices[currentList] || {}).reduce((sum, price) => sum + price.amount, 0);
                const participants = [auth.currentUser?.email || "Tú", ...(allLists.find(list => list.id === currentList)?.sharedWith || [])];

                if (!totalPrice || totalPrice === 0) {
                  return <p style={{ color: "black" }}>Primero establece el precio total de la compra usando 'Finalizar Compra'</p>;
                }

                const sharePerPerson = totalPrice / participants.length;
                const result = `Resumen de Gastos\n\nTotal gastado: ${totalPrice.toFixed(2)} €\nNúmero de personas: ${participants.length}\nPrecio por persona: ${sharePerPerson.toFixed(2)} €\n\n${participants.map((p, i) => `${i + 1}. ${p}: ${sharePerPerson.toFixed(2)} €`).join('\n')}`;

                return (
                  <div className="split-result">
                    <p style={{ color: "black" }}><strong>Total:</strong> {totalPrice.toFixed(2)} €</p>
                    <p style={{ color: "black" }}><strong>Personas:</strong> {participants.length}</p>
                    <p style={{ color: "black" }}><strong>Por persona:</strong> {sharePerPerson.toFixed(2)} €</p>
                    <div className="participants-list">
                      {participants.map((participant, index) => (
                        <div key={index} className="participant" style={{ color: "black" }}>
                          {participant}: <strong>{sharePerPerson.toFixed(2)} €</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="dialog-buttons">
              <button onClick={() => setSplitDialogOpen(false)} className="cancel-btn" style={{ color: "black" }}>
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
                  alert("Copiado al portapapeles");
                }}
                className="blue-button"
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Información Adicional */}
      {extraInfoDialogOpen && (
        <div className="modal-overlay">
          <div className="dialog-modal" style={{ backgroundColor: "white" }}>
            <div className="dialog-header">
              <h3 style={{ color: "black" }}>Información Adicional</h3>
              <button
                onClick={() => setExtraInfoDialogOpen(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="dialog-content">
              <p style={{ color: "black" }}>Añade información general sobre la compra:</p>
              <textarea
                value={extraInfo[currentList] || ""}
                onChange={(e) => setExtraInfo(prev => ({ ...prev, [currentList]: e.target.value }))}
                placeholder="Ej: Compra en Mercadona, productos de oferta, etc."
                rows="4"
                className="elegant-textarea"
                style={{ color: "black", width: "100%" }}
              />
            </div>

            <div className="dialog-buttons">
              <button onClick={() => setExtraInfoDialogOpen(false)} className="cancel-btn" style={{ color: "black" }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  saveExtraInfo(currentList, extraInfo[currentList] || "");
                  setExtraInfoDialogOpen(false);
                }}
                className="blue-button"
              >
                Guardar
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
        
        .app-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-image: url('https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          background-repeat: no-repeat;
        }
        
        .app-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background-color: var(--white);
          border-bottom: 1px solid #e0e0e0;
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 100;
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
        
        .logout-btn {
          background: #f0f0f0;
          border: 1px solid #e0e0e0;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .logout-btn:hover {
          background-color: #e0e0e0;
        }
        
        .main-content {
          flex: 1;
          padding: 20px;
          display: flex;
          justify-content: center;
          width: 100%;
          overflow: hidden;
        }
        
        .content-card {
          width: 100%;
          max-width: 800px;
          background-color: var(--white);
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e0e0e0;
          margin: 0 auto;
          overflow: hidden;
        }
        
        .list-creation {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          width: 100%;
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
          min-width: 0;
          width: 100%;
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
        
        .add-button {
          border: 1px solid var(--dark-blue);
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          min-width: 48px;
          white-space: nowrap;
        }
        
        .add-button:hover {
          background-color: var(--light-blue);
        }
        
        .add-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .list-selector-container {
          margin-bottom: 20px;
          width: 100%;
        }
        
        .list-selector {
          display: flex;
          gap: 10px;
          align-items: center;
          width: 100%;
        }
        
        .elegant-select {
          flex: 1;
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
          min-width: 0;
          width: 100%;
        }
        
        .list-actions {
          display: flex;
          gap: 5px;
        }
        
        .action-btn {
          background: #f0f0f0;
          border: 1px solid #e0e0e0;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          min-width: 36px;
          min-height: 36px;
        }
        
        .action-btn:hover {
          background-color: #e0e0e0;
        }

        .optimistic-item {
          color: #888;
          font-style: italic;
        }

        .optimistic-item:disabled {
          background-color: #f5f5f5;
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .no-lists-message {
          text-align: center;
          color: var(--dark-gray);
          margin: 20px 0;
        }
        
        .items-section {
          margin-top: 20px;
          width: 100%;
        }
        
        .items-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .sort-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          color: black;
          cursor: pointer;
        }
        
        .sort-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .item-input-container {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          width: 100%;
        }
        
        .category-select {
          padding: 12px 15px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          background-color: var(--white);
          color: var(--text-color);
          min-width: 180px;
        }
        
        .items-list {
          list-style: none;
          width: 100%;
          padding: 0;
          margin: 0;
        }
        
        .category-header {
          padding: 8px 15px;
          border-radius: 8px;
          margin: 10px 0 5px 0;
          font-weight: bold;
          color: var(--text-color);
        }
        
        .item-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background-color: var(--white);
          border-radius: 8px;
          margin-bottom: 10px;
          border: 1px solid #e0e0e0;
          width: 100%;
          max-width: 100%;
        }
        
        .item-card.completed {
          background-color: var(--completed-item);
        }
        
        .item-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        
        .item-checkbox {
          min-width: 20px;
          min-height: 20px;
          cursor: pointer;
          accent-color: var(--primary-blue);
          flex-shrink: 0;
        }
        
        .item-text {
          flex: 1;
          color: var(--text-color);
          font-size: 1rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .strikethrough {
          text-decoration: line-through;
          color: var(--dark-gray);
        }
        
        .delete-item-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        
        .delete-item-btn:hover {
          background-color: #ffebee;
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
        line-height: 1;
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
      }

      .share-input .elegant-input {
        flex: 1;
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
        }

        .list-info-header h4 {
          margin: 0;
          color: #495057;
          font-size: 1.1rem;
        }

        .list-info-actions {
          display: flex;
          gap: 8px;
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

        .item-metadata {
          margin-top: 4px;
          font-size: 0.8rem;
          color: #6c757d;
        }

        .purchaser-info, .added-by-info {
          display: block;
          margin-top: 2px;
        }

        .item-price {
          margin-top: 4px;
        }

        .price-tag {
          background-color: #e7f3ff;
          color: #0066cc;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .item-actions {
          display: flex;
          gap: 8px;
          align-items: center;
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .elegant-spinner {
          animation: spin 1s linear infinite;
        }
        
        .elegant-item {
          transition: all 0.3s ease;
        }
        
        .elegant-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
`}</style>

    </div>
  );
}
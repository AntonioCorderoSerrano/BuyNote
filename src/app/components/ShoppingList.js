import React from 'react';
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, writeBatch, getDocs, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FileText, Users, ShoppingCart } from "lucide-react";


export function ShoppingList() {
  // Estados principales de la aplicación
  const [items, setItems] = useState([]); // Lista de productos
  const [lists, setLists] = useState([]); // Listas del usuario
  const [sharedLists, setSharedLists] = useState([]); // Listas compartidas con el usuario
  const [currentList, setCurrentList] = useState(""); // Lista actualmente seleccionada
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Manejo de errores
  const [purchaseInfo, setPurchaseInfo] = useState({});

  // Estados para confirmaciones y diálogos
  const [confirmDelete, setConfirmDelete] = useState(null); // Confirmación eliminar producto
  const [confirmListDelete, setConfirmListDelete] = useState(null); // Confirmación eliminar lista
  const [shareDialogOpen, setShareDialogOpen] = useState(false); // Diálogo compartir lista
  const [emailToShare, setEmailToShare] = useState(""); // Email para compartir
  const [sharedUsers, setSharedUsers] = useState([]); // Usuarios con quienes se compartió
  const [unshareDialogOpen, setUnshareDialogOpen] = useState(false); // Diálogo dejar de compartir
  const [userToUnshare, setUserToUnshare] = useState(""); // Usuario para dejar de compartir
  const [userReady, setUserReady] = useState(false); // Usuario autenticado y listo

  // Estados para validación y observaciones
  const [emailValidation, setEmailValidation] = useState({ valid: true, message: "" });
  const [listObservations, setListObservations] = useState({}); // Observaciones por lista
  const [observationsDialogOpen, setObservationsDialogOpen] = useState(false); // Diálogo observaciones
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false); // Diálogo finalizar compra
  const [splitDialogOpen, setSplitDialogOpen] = useState(false); // Diálogo dividir gastos
  const [editingObservations, setEditingObservations] = useState(false); // Modo edición observaciones
  const initialLoad = useRef(true);

  // Referencias para cache
  const itemsCache = useRef({});
  const listsCache = useRef({ userLists: [], sharedLists: [] });

  // Categorías mejoradas con íconos y colores para organización visual
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
      keywords: ["leche", "queso", "yogur", "mantequilla", "margarina", "nata", "crema", "queso crema", "leche condensada", "leche evaporada", "requesón", "kefir", "batido de leche"]
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
      keywords: ["agua", "refresco", "zumo", "jugo", "cerveza", "vino", "café", "té", "bebida energética", "batido", "licor", "kombucha", "agua con gas", "horchata", "infusión", "cola cao"]
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

  // Función para mostrar notificaciones toast
  const showToast = (message, type = 'info') => {
    const toastConfig = {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
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

  // Función para detectar categoría automáticamente basada en el nombre del producto
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

  // Obtener información de categoría por su ID
  const getCategoryInfo = (category) => {
    return CATEGORIES[category] || CATEGORIES.OTHER;
  };

  // Función para abrir el diálogo de compartir lista
  const openShareDialog = () => {
    if (!currentList) return;

    const currentListData = [...lists, ...sharedLists].find(list => list.id === currentList);
    setSharedUsers(currentListData?.sharedWith || []);
    setShareDialogOpen(true);
  };

  useEffect(() => {
    // Este efecto asegura que currentList no se cambie accidentalmente
    // durante operaciones que no deberían afectarla
    console.log("Lista actual:", currentList);
  }, [currentList]);

  // También puedes agregar una verificación en el efecto de carga de items
  useEffect(() => {
    if (!currentList) {
      setItems([]);
      return;
    }

    console.log("Cargando items para lista:", currentList);

    const q = query(
      collection(db, "items"),
      where("listId", "==", currentList)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        // Verificar que todavía estamos en la misma lista
        if (!currentList) return;

        const updatedItems = snapshot.docs.map(doc => {
          const data = doc.data();

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
        setItems(combinedItems);
      },
      (error) => {
        setError(`Error al cargar productos: ${error.message}`);
        showToast(`Error al cargar productos: ${error.message}`, 'error');
      }
    );

    return unsubscribe;
  }, [currentList]);

  // Crear una nueva lista de compras
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

      // Actualización optimista para respuesta inmediata
      setLists(prev => [...prev, tempList]);
      setCurrentList(tempId); // Esta línea está bien - es una nueva lista

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

      setCurrentList(docRef.id); // Mantener en la nueva lista creada
      showToast(`Lista "${listName}" creada exitosamente`, 'success');
      return docRef.id;

    } catch (err) {
      console.error("Error creando lista:", err);
      // Revertir actualización optimista en caso de error
      setLists(prev => prev.filter(list => list.id !== tempId));
      throw err;
    }
  };

  // Añadir un nuevo producto a la lista actual
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

  // Alternar estado de completado de un producto
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

      // Preparar datos para Firebase
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

  // Cargar observaciones de la lista desde Firebase
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

  // Guardar observaciones de la lista en Firebase
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

  // Eliminar un producto de la lista
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
            await deleteDoc(itemRef);
          }
        } catch (firestoreError) {
          throw new Error(`Error al eliminar de la base de datos: ${firestoreError.message}`);
        }
      }

      showToast('Producto eliminado', 'success');

    } catch (err) {
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

  // Eliminar una lista completa y todos sus productos
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
      });

      // Eliminar observaciones de la lista
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

      // SOLO cambiar currentList si se está eliminando la lista actual
      if (currentList === listId) {
        // Buscar otra lista disponible
        const remainingLists = [...lists, ...sharedLists].filter(list => list.id !== listId);
        if (remainingLists.length > 0) {
          setCurrentList(remainingLists[0].id);
        } else {
          setCurrentList("");
        }
      }

      // Mostrar mensaje de éxito
      showToast("Lista eliminada exitosamente", 'success');

    } catch (err) {
      setError(`Error al eliminar: ${err.message}`);
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  // Compartir lista con otro usuario
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

  // Dejar de compartir lista con un usuario
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

      // Eliminar items del usuario
      const itemsQuery = query(
        collection(db, "items"),
        where("listId", "==", currentList),
        where("userId", "==", userToUnshare)
      );

      const querySnapshot = await getDocs(itemsQuery);
      querySnapshot.forEach((itemDoc) => {
        batch.delete(itemDoc.ref);
      });

      // Eliminar al usuario de la división de gastos
      const paymentsRef = doc(db, "listPayments", currentList);
      const paymentsDoc = await getDoc(paymentsRef);

      if (paymentsDoc.exists()) {
        const paymentsData = paymentsDoc.data();
        const currentPaymentParticipants = paymentsData.paymentParticipants || [];

        // Filtrar al usuario eliminado de los participantes
        const newPaymentParticipants = currentPaymentParticipants.filter(
          participant => participant.email !== userToUnshare
        );

        // Eliminar también sus pagos registrados
        const newPayments = { ...paymentsData.payments };
        delete newPayments[userToUnshare];

        // Actualizar el documento de pagos
        batch.set(paymentsRef, {
          ...paymentsData,
          payments: newPayments,
          paymentParticipants: newPaymentParticipants,
          updatedAt: new Date(),
          updatedBy: auth.currentUser?.email
        }, { merge: true });
      }

      await batch.commit();

      setUnshareDialogOpen(false);
      setUserToUnshare("");
      showToast(`Lista dejada de compartir con ${userToUnshare}`, 'success');
    } catch (err) {
      setSharedUsers([...sharedUsers, userToUnshare]);
      setError(`Error al eliminar compartido: ${err.message}`);
      showToast(`Error al eliminar compartido: ${err.message}`, 'error');
    }
  };

  // Efectos para carga de datos
  useEffect(() => {
    if (currentList) {
      loadListObservations(currentList);
      loadPurchaseInfo(currentList);
    }
  }, [currentList]);

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

  // Resetear estado cuando el usuario cierra sesión
  const resetState = () => {
    setItems([]);
    setLists([]);
    setSharedLists([]);
    setCurrentList("");
    itemsCache.current = {};
    listsCache.current = { userLists: [], sharedLists: [] };
  };

  // Función para cargar información de compra
  const loadPurchaseInfo = async (listId) => {
    try {
      const listDoc = await getDoc(doc(db, "lists", listId));
      if (listDoc.exists()) {
        const data = listDoc.data();
        setPurchaseInfo(prev => ({
          ...prev,
          [listId]: data.purchaseInfo || null
        }));
      }
    } catch (error) {
      console.error("Error cargando información de compra:", error);
    }
  };

  // Función para finalizar compra - guardar precio total
  const finalizePurchase = async (listId, totalPrice) => {
    try {
      // Guardar el currentList actual para asegurarnos de no perderlo
      const currentListBeforeUpdate = currentList;

      if (totalPrice !== null) {
        const purchaseInfoData = {
          totalPrice: parseFloat(totalPrice),
          finalizedAt: new Date(),
          finalizedBy: auth.currentUser?.email || "",
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

      // Asegurarse de que currentList no cambió durante la operación
      if (currentList !== currentListBeforeUpdate) {
        console.warn("currentList cambió durante finalizePurchase, restaurando...");
        setCurrentList(currentListBeforeUpdate);
      }

    } catch (error) {
      console.error("Error finalizando compra:", error);
      showToast("Error al guardar precio: " + error.message, 'error');
    }
  };

  // Cargar datos iniciales del usuario
  const loadInitialData = async (user) => {
    try {
      setLoading(true);
      initialLoad.current = true; // Resetear el flag de carga inicial

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

      return () => {
        userUnsubscribe();
        sharedUnsubscribe();
      };
    } catch (err) {
      setError(`Error loading data: ${err.message}`);
      showToast(`Error cargando datos: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cargar listas del usuario desde Firebase
  const loadUserLists = async (user) => {
    const userListsQuery = query(
      collection(db, "lists"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(userListsQuery, (snapshot) => {
      const userLists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      listsCache.current.userLists = userLists;
      setLists(userLists);

      // SOLO CAMBIAR LA LISTA ACTUAL EN LA CARGA INICIAL
      if (initialLoad.current && userLists.length > 0 && !currentList) {
        setCurrentList(userLists[0].id);
        initialLoad.current = false;
      }
    });

    return unsubscribe;
  };

  // Cargar listas compartidas con el usuario desde Firebase
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

  // Efecto para cargar items de la lista actual
  useEffect(() => {
    if (!currentList) {
      setItems([]);
      return;
    }

    const q = query(
      collection(db, "items"),
      where("listId", "==", currentList)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const updatedItems = snapshot.docs.map(doc => {
          const data = doc.data();

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
        setItems(combinedItems);
      },
      (error) => {
        setError(`Error al cargar productos: ${error.message}`);
        showToast(`Error al cargar productos: ${error.message}`, 'error');
      }
    );

    return unsubscribe;
  }, [currentList]);

  // Función para crear lista - wrapper
  const handleCreateList = async (listName) => {
    try {
      if (!listName.trim()) return;

      await createElegantList(listName);
    } catch (err) {
      setError(`Error al crear lista: ${err.message}`);
      showToast(`Error al crear lista: ${err.message}`, 'error');
    }
  };

  // Función para añadir item - wrapper
  const handleAddItem = async (itemText) => {
    try {
      if (!itemText.trim()) return;

      await addElegantItem(itemText);
    } catch (err) {
      setError(`Error al añadir producto: ${err.message}`);
      showToast(`Error al añadir producto: ${err.message}`, 'error');
    }
  };

  // Funciones auxiliares
  const allLists = [...lists, ...sharedLists];

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

  // Función para verificar si el usuario actual puede modificar la lista
  const canUserModifyList = () => {
    if (!currentList) return false;

    // El dueño siempre puede modificar
    if (isCurrentListOwned()) return true;

    // Los usuarios con listas compartidas pueden modificar
    if (isCurrentListShared()) return true;

    return false;
  };

  // Verificar si la lista actual es compartida con el usuario
  const isCurrentListShared = () => {
    return sharedLists.some(list => list.id === currentList);
  };

  const isCurrentListSharedByMe = () => {
    const currentListData = lists.find(list => list.id === currentList);
    return currentListData && currentListData.sharedWith && currentListData.sharedWith.length > 0;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkUserExists = async (email) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return false;
      }
      return true;
    } catch (error) {
      return true;
    }
  };

  // Ordenar items: pendientes primero, luego por categoría y texto
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.category !== b.category) {
      return (a.category || "OTHER").localeCompare(b.category || "OTHER");
    }
    return a.text.localeCompare(b.text);
  });


  // Componente para la sección de información de la lista
  const ListInfoSection = () => {
    if (!currentList) return null;

    const currentObservations = listObservations[currentList] || "";
    const currentPurchaseInfo = purchaseInfo[currentList];
    const isSharedList = isCurrentListShared() || isCurrentListSharedByMe();

    return (
      <div className="list-info-section" style={{ marginBottom: "3%" }}>
        <div className="list-info-header">
          <h4 style={{ color: "black" }}>Información de la Lista</h4>
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
                color: "black",
                cursor: "pointer"
              }}
            >
              <FileText size={24} /> {/* más grande */}
            </button>

            {/* Botón de Dividir Gastos - solo visible en listas compartidas */}
            {isSharedList && (
              <button
                onClick={() => setSplitDialogOpen(true)}
                className="action-btn"
                title="Dividir Gastos"
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "black",
                  cursor: "pointer"
                }}
              >
                <Users size={24} />
              </button>
            )}

            <button
              onClick={() => setFinalizeDialogOpen(true)}
              className="action-btn"
              title="Finalizar Compra"
              style={{
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "white",
                color: "black",
                cursor: "pointer"
              }}
            >
              <ShoppingCart size={24} />
            </button>
          </div>
        </div>

        {/* Muestra el precio total si existe */}
        {currentPurchaseInfo?.totalPrice && (
          <div className="total-price-info" style={{ marginBottom: "12px" }}>
            <strong style={{ color: "black" }}>Precio total: </strong>
            <span style={{
              color: "#10B981",
              fontWeight: "bold",
              fontSize: "16px"
            }}>
              {currentPurchaseInfo.totalPrice.toFixed(2)} €
            </span>
          </div>
        )}

        {currentObservations && (
          <div className="observations-preview">
            <strong style={{ color: "black" }}>Observaciones:</strong>
            <p style={{ color: "black" }}>{currentObservations.length > 100
              ? currentObservations.substring(0, 100) + "..."
              : currentObservations}</p>
          </div>
        )}
      </div>
    );
  };

  // Agrupar items por categoría para mostrar organizadamente
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



  // Componente elegante para renderizar items individuales 
  const ElegantItem = ({ item }) => {
    const isSharedList = isCurrentListShared() || isCurrentListSharedByMe();

    // Calcular categoryInfo dinámicamente basado en la categoría del item
    const categoryInfo = getCategoryInfo(item.category || "OTHER");

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

            {/* INFORMACIÓN DE QUIÉN AÑADIÓ Y QUIÉN COMPRÓ - SOLO EN LISTAS COMPARTIDAS */}
            {isSharedList && (
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
            )}
          </div>
        </div>

        <div className="item-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

  // Componente para crear listas
  const ElegantListCreator = () => {
    const [localListName, setLocalListName] = useState("");

    const handleCreate = async () => {
      if (!localListName.trim()) return;

      try {
        await handleCreateList(localListName);
        setLocalListName(""); // Limpiar solo si fue exitoso
      } catch (error) {
        // El error ya se maneja en handleCreateList
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
        backgroundColor: '#F0F9FF',
        borderRadius: '12px',
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
      </div>
    );
  };

  // Componente elegante para añadir items
  const ElegantItemAdder = () => {
    const [localItem, setLocalItem] = useState("");

    // Verificar si el usuario puede añadir productos
    const canAddItems = () => {
      if (!currentList) return false;

      // Si es dueño de la lista, siempre puede añadir
      if (isCurrentListOwned()) return true;

      // Si es una lista compartida con él, puede añadir
      if (isCurrentListShared()) return true;

      return false;
    };

    const handleAdd = async () => {
      if (!localItem.trim() || !canAddItems()) return;

      try {
        await handleAddItem(localItem);
        setLocalItem("");
      } catch (error) {
        // El error ya se maneja en handleAddItem
      }
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && canAddItems()) {
        handleAdd();
      }
    };

    const canAdd = canAddItems();

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
          placeholder={canAdd ? "Añadir nuevo producto..." : "No tienes permisos para añadir productos"}
          className="elegant-input"
          style={{
            flex: '1 1 200px',
            minWidth: '0',
            padding: '12px 16px',
            border: `1px solid ${canAdd ? '#D1D5DB' : '#FECACA'}`,
            borderRadius: '8px',
            fontSize: '16px',
            color: canAdd ? '#1F2937' : '#6B7280',
            backgroundColor: canAdd ? 'white' : '#FEF2F2',
            outline: 'none',
            transition: 'all 0.2s',
            boxSizing: 'border-box',
            cursor: canAdd ? 'text' : 'not-allowed'
          }}
          onFocus={(e) => canAdd && (e.target.style.borderColor = '#3B82F6')}
          onBlur={(e) => canAdd && (e.target.style.borderColor = '#D1D5DB')}
          disabled={!canAdd}
        />
        <button
          onClick={handleAdd}
          disabled={!localItem.trim() || !canAdd}
          className="elegant-add-btn"
          style={{
            flex: '0 0 auto',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: !localItem.trim() || !canAdd ? '#9CA3AF' : '#10B981',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !localItem.trim() || !canAdd ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            minWidth: '120px',
            boxSizing: 'border-box'
          }}
          onMouseEnter={(e) => {
            if (localItem.trim() && canAdd) {
              e.target.style.backgroundColor = '#059669';
            }
          }}
          onMouseLeave={(e) => {
            if (localItem.trim() && canAdd) {
              e.target.style.backgroundColor = '#10B981';
            }
          }}
          title={!canAdd ? "No tienes permisos para añadir productos a esta lista" : "Añadir producto"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="button-text">Añadir</span>
        </button>
      </div>
    );
  };

  // Componente para el contenido del diálogo de división de gastos
  const SplitDialogContent = () => {
    const isSharedList = isCurrentListShared() || isCurrentListSharedByMe();
    const currentPurchaseInfo = purchaseInfo[currentList];
    const totalPrice = currentPurchaseInfo?.totalPrice;

    // Obtener participantes dinámicamente
    const currentListData = allLists.find(list => list.id === currentList);
    const [allPossibleParticipants, setAllPossibleParticipants] = useState([]);
    const [paymentParticipants, setPaymentParticipants] = useState([]);
    const [payments, setPayments] = useState({});
    const [isOwner, setIsOwner] = useState(false);

    // Verificar si el usuario actual es el propietario
    useEffect(() => {
      if (currentListData && auth.currentUser) {
        const owner = currentListData.userId === auth.currentUser.uid;
        setIsOwner(owner);
      }
    }, [currentListData, auth.currentUser]);

    // Cargar todos los posibles participantes (propietario + sharedWith)
    useEffect(() => {
      if (currentListData) {
        const possibleParticipants = [
          {
            email: currentListData.ownerEmail || auth.currentUser?.email,
            name: (currentListData.ownerEmail || auth.currentUser?.email)?.split('@')[0] || 'Tú',
            isOwner: true,
            userId: currentListData.userId
          },
          ...(currentListData.sharedWith || []).map(email => ({
            email,
            name: email.split('@')[0],
            isOwner: false,
            userId: null
          }))
        ];
        setAllPossibleParticipants(possibleParticipants);

        // Sincronizar automáticamente con los usuarios que tienen acceso
        const paymentsRef = doc(db, "listPayments", currentList);
        getDoc(paymentsRef).then((paymentsDoc) => {
          if (paymentsDoc.exists()) {
            const paymentsData = paymentsDoc.data();
            const currentPaymentParticipants = paymentsData.paymentParticipants || [];

            // Filtrar participantes que ya no tienen acceso a la lista
            const validPaymentParticipants = currentPaymentParticipants.filter(
              participant =>
                participant.email === currentListData.ownerEmail ||
                currentListData.sharedWith?.includes(participant.email)
            );

            // Si hay diferencias, actualizar Firestore
            if (validPaymentParticipants.length !== currentPaymentParticipants.length) {
              setDoc(paymentsRef, {
                ...paymentsData,
                paymentParticipants: validPaymentParticipants,
                updatedAt: new Date()
              }, { merge: true });
            }

            setPaymentParticipants(validPaymentParticipants);
          } else {
            // Si no existe documento de pagos, usar todos los posibles participantes
            setPaymentParticipants(possibleParticipants);
          }
        });
      }
    }, [currentListData]);

    const cleanupPaymentParticipants = async () => {
      if (!currentList) return;

      try {
        const listDoc = await getDoc(doc(db, "lists", currentList));
        if (!listDoc.exists()) return;

        const listData = listDoc.data();
        const paymentsRef = doc(db, "listPayments", currentList);
        const paymentsDoc = await getDoc(paymentsRef);

        if (paymentsDoc.exists()) {
          const paymentsData = paymentsDoc.data();
          const currentPaymentParticipants = paymentsData.paymentParticipants || [];

          // Filtrar participantes que ya no tienen acceso
          const validPaymentParticipants = currentPaymentParticipants.filter(
            participant =>
              participant.email === listData.ownerEmail ||
              listData.sharedWith?.includes(participant.email)
          );

          // Si hay usuarios que limpiar, actualizar Firestore
          if (validPaymentParticipants.length !== currentPaymentParticipants.length) {
            const newPayments = { ...paymentsData.payments };

            // Eliminar pagos de usuarios sin acceso
            currentPaymentParticipants.forEach(participant => {
              if (!validPaymentParticipants.some(p => p.email === participant.email)) {
                delete newPayments[participant.email];
              }
            });

            await setDoc(paymentsRef, {
              ...paymentsData,
              payments: newPayments,
              paymentParticipants: validPaymentParticipants,
              updatedAt: new Date(),
              updatedBy: auth.currentUser?.email
            }, { merge: true });

            console.log("Usuarios sin acceso eliminados de la división de gastos");
          }
        }
      } catch (error) {
        console.error("Error limpiando participantes de pagos:", error);
      }
    };

    // Llama a esta función cuando se cargue la lista
    useEffect(() => {
      if (currentList) {
        cleanupPaymentParticipants();
      }
    }, [currentList]);

    // SUSCRIPCIÓN EN TIEMPO REAL A LOS PAGOS
    useEffect(() => {
      if (!currentList) return;

      const unsubscribe = onSnapshot(
        doc(db, "listPayments", currentList),
        (doc) => {
          if (doc.exists()) {
            const paymentData = doc.data();
            console.log("Actualización en tiempo real de pagos:", paymentData);
            setPayments(paymentData.payments || {});

            // Cargar la lista de participantes de la división desde Firebase
            if (paymentData.paymentParticipants) {
              setPaymentParticipants(paymentData.paymentParticipants);
            }
          } else {
            setPayments({});
          }
        },
        (error) => {
          console.error("Error en suscripción de pagos:", error);
        }
      );

      return () => unsubscribe();
    }, [currentList]);

    // Función para guardar estado de pago (SOLO PROPIETARIO)
    const savePaymentStatus = async (email, paid) => {
      if (!isOwner) {
        showToast("Solo el propietario puede marcar pagos", 'error');
        return;
      }

      try {
        const newPayments = {
          ...payments,
          [email]: {
            paid,
            paidAt: paid ? new Date() : null,
            paidBy: auth.currentUser?.email,
            updatedAt: new Date()
          }
        };

        await savePaymentsToFirebase(newPayments, paymentParticipants);
        showToast(`Estado de pago ${paid ? 'actualizado' : 'revertido'}`, 'success');
      } catch (error) {
        console.error("Error guardando estado de pago:", error);
        showToast("Error al actualizar estado de pago", 'error');
      }
    };

    // Función para guardar en Firebase
    const savePaymentsToFirebase = async (paymentsData, participantsData) => {
      await setDoc(doc(db, "listPayments", currentList), {
        payments: paymentsData,
        paymentParticipants: participantsData,
        updatedAt: new Date(),
        updatedBy: auth.currentUser?.email,
        listId: currentList,
        listName: currentListData?.name
      }, { merge: true });
    };

    // Función para ELIMINAR SOLO DE LA DIVISIÓN DE GASTOS
    const removeFromPaymentSplit = async (email) => {
      if (!isOwner) {
        showToast("Solo el propietario puede eliminar participantes de la división", 'error');
        return;
      }

      const participant = paymentParticipants.find(p => p.email === email);
      if (participant?.isOwner) {
        showToast("No puedes eliminar al propietario de la división", 'error');
        return;
      }

      try {
        // Crear nueva lista sin el participante eliminado
        const newPaymentParticipants = paymentParticipants.filter(p => p.email !== email);

        // Eliminar también sus pagos
        const newPayments = { ...payments };
        delete newPayments[email];

        // Guardar en Firebase
        await savePaymentsToFirebase(newPayments, newPaymentParticipants);

        // La actualización vendrá automáticamente por onSnapshot
        showToast(`${email} eliminado de la división de gastos`, 'success');
      } catch (error) {
        console.error("Error eliminando participante de la división:", error);
        showToast("Error al eliminar participante de la división", 'error');
      }
    };

    // Función para AÑADIR participante a la división de gastos
    const addToPaymentSplit = async (email) => {
      if (!isOwner) {
        showToast("Solo el propietario puede añadir participantes a la división", 'error');
        return;
      }

      if (!email.trim() || !isValidEmail(email)) {
        showToast("Email inválido", 'error');
        return;
      }

      // Verificar si ya está en la división
      if (paymentParticipants.some(p => p.email === email)) {
        showToast("Este usuario ya está en la división de gastos", 'warning');
        return;
      }

      try {
        // Buscar si el usuario está en los posibles participantes
        const existingParticipant = allPossibleParticipants.find(p => p.email === email);

        let newParticipant;
        if (existingParticipant) {
          // Si ya existe en sharedWith, usar sus datos
          newParticipant = existingParticipant;
        } else {
          // Si es un nuevo email, crear participante
          newParticipant = {
            email: email.trim(),
            name: email.split('@')[0],
            isOwner: false,
            userId: null
          };

          // También añadirlo a los posibles participantes
          setAllPossibleParticipants(prev => [...prev, newParticipant]);
        }

        // Añadir a la lista de participantes de la división
        const newPaymentParticipants = [...paymentParticipants, newParticipant];

        // Guardar en Firebase
        await savePaymentsToFirebase(payments, newPaymentParticipants);

        showToast(`${email} añadido a la división de gastos`, 'success');
      } catch (error) {
        console.error("Error añadiendo participante a la división:", error);
        showToast("Error al añadir participante a la división", 'error');
      }
    };

    // Función para REAÑADIR un participante que fue eliminado
    const readdToPaymentSplit = async (email) => {
      if (!isOwner) {
        showToast("Solo el propietario puede reañadir participantes", 'error');
        return;
      }

      try {
        // Buscar el participante en los posibles participantes
        const participantToAdd = allPossibleParticipants.find(p => p.email === email);

        if (!participantToAdd) {
          showToast("No se encontró el participante", 'error');
          return;
        }

        // Añadir a la lista de participantes de la división
        const newPaymentParticipants = [...paymentParticipants, participantToAdd];

        // Guardar en Firebase
        await savePaymentsToFirebase(payments, newPaymentParticipants);

        showToast(`${email} reañadido a la división de gastos`, 'success');
      } catch (error) {
        console.error("Error reañadiendo participante:", error);
        showToast("Error al reañadir participante", 'error');
      }
    };

    // Calcular precio por persona
    const sharePerPerson = totalPrice && paymentParticipants.length > 0
      ? totalPrice / paymentParticipants.length
      : 0;

    // Calcular resumen de pagos
    const paymentSummary = {
      total: paymentParticipants.length,
      paid: Object.values(payments).filter(p => p.paid).length,
      pending: paymentParticipants.length - Object.values(payments).filter(p => p.paid).length,
      totalCollected: Object.values(payments).filter(p => p.paid).length * sharePerPerson,
      totalPending: (paymentParticipants.length - Object.values(payments).filter(p => p.paid).length) * sharePerPerson
    };

    // Encontrar participantes que están en la lista pero no en la división
    const excludedParticipants = allPossibleParticipants.filter(
      p => !paymentParticipants.some(pp => pp.email === p.email)
    );

    // Encontrar el estado de pago del usuario actual
    const currentUserPayment = payments[auth.currentUser?.email] || { paid: false };

    if (!isSharedList) {
      return (
        <div className="dialog-content" style={{ padding: '24px', flex: 1, overflowY: 'auto', background: 'white' }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#6b7280' }}>
              👥
            </div>
            <p style={{ color: '#374151', marginBottom: '8px', fontSize: '16px', fontWeight: '500' }}>
              Solo disponible para listas compartidas
            </p>
          </div>
        </div>
      );
    }

    // VISTA PARA USUARIOS NO PROPIETARIOS (solo ven su información)
    if (!isOwner) {
      return (
        <div className="dialog-content" style={{ padding: '24px', flex: 1, overflowY: 'auto', background: 'white' }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#1f2937', marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
              Mi Pago - División de Gastos
            </h4>

            {!totalPrice ? (
              <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ width: '48px', height: '48px', margin: '0 auto 12px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#6b7280' }}>
                  💰
                </div>
                <p style={{ color: '#374151', marginBottom: '8px', fontSize: '16px', fontWeight: '500' }}>
                  Precio total no establecido
                </p>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                  El propietario debe establecer el precio total para calcular la división
                </p>
              </div>
            ) : (
              <>
                {/* Información personal del usuario */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    margin: '0 auto 12px',
                    backgroundColor: currentUserPayment.paid ? '#10b981' : '#f59e0b',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: 'white'
                  }}>
                    {currentUserPayment.paid ? '✓' : '€'}
                  </div>

                  <h5 style={{
                    color: '#1f2937',
                    fontSize: '18px',
                    fontWeight: '700',
                    marginBottom: '8px'
                  }}>
                    {currentUserPayment.paid ? '✅ PAGADO' : '⏳ PENDIENTE'}
                  </h5>

                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '8px'
                  }}>
                    {sharePerPerson.toFixed(2)} €
                  </div>

                  <p style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    Tu parte de {totalPrice.toFixed(2)} € entre {paymentParticipants.length} personas
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // VISTA PARA EL PROPIETARIO (ve toda la información)
    return (
      <div className="dialog-content" style={{ padding: '24px', flex: 1, overflowY: 'auto', background: 'white' }}>
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#1f2937', marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
            División de Gastos - Gestión Completa
          </h4>

          {!totalPrice ? (
            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ width: '48px', height: '48px', margin: '0 auto 12px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#6b7280' }}>
                💰
              </div>
              <p style={{ color: '#374151', marginBottom: '8px', fontSize: '16px', fontWeight: '500' }}>
                Precio total no establecido
              </p>
              <button
                onClick={() => {
                  setSplitDialogOpen(false);
                  setFinalizeDialogOpen(true);
                }}
                className="blue-button"
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Establecer Precio
              </button>
            </div>
          ) : (
            <>
              {/* Resumen de gastos COMPLETO para propietario */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
                      TOTAL GASTADO
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                      {totalPrice.toFixed(2)} €
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
                      PERSONAS
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                      {paymentParticipants.length}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#10b981',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #059669',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '12px', color: 'white', marginBottom: '4px', fontWeight: '500', opacity: 0.9 }}>
                      POR PERSONA
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                      {sharePerPerson.toFixed(2)} €
                    </div>
                  </div>
                </div>

                {/* Resumen de pagos DETALLADO para propietario */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '8px',
                  marginTop: '12px'
                }}>
                  <div style={{
                    backgroundColor: '#dcfce7',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#166534', marginBottom: '2px', fontWeight: '500' }}>
                      PAGADO
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#166534' }}>
                      {paymentSummary.paid}/{paymentSummary.total}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#fef3c7',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #fde68a',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '2px', fontWeight: '500' }}>
                      PENDIENTE
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#92400e' }}>
                      {paymentSummary.pending}
                    </div>
                  </div>
                </div>
              </div>

              {/* Participantes en la división de gastos - VISTA COMPLETA DEL PROPIETARIO */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h5 style={{ color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                    Gestión de Participantes ({paymentParticipants.length})
                  </h5>
                  <button
                    onClick={() => {
                      const email = prompt("Introduce el email para añadir a la división de gastos:");
                      if (email) addToPaymentSplit(email);
                    }}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    + Añadir
                  </button>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {paymentParticipants.map((participant, index) => (
                    <div
                      key={participant.email}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          {participant.name} {participant.isOwner && '(Tú)'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {sharePerPerson.toFixed(2)} € • {participant.email}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Toggle de pago - Solo propietario puede cambiar */}
                        <button
                          onClick={() => savePaymentStatus(participant.email, !payments[participant.email]?.paid)}
                          style={{
                            backgroundColor: payments[participant.email]?.paid ? '#10b981' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            minWidth: '80px'
                          }}
                        >
                          {payments[participant.email]?.paid ? 'Pagado' : 'Pendiente'}
                        </button>

                        {/* Botón eliminar SOLO de la división (solo para no propietarios) */}
                        {!participant.isOwner && (
                          <button
                            onClick={() => removeFromPaymentSplit(participant.email)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#ef4444',
                              border: '1px solid #ef4444',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                            title="Eliminar de la división de gastos"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Participantes excluidos de la división (solo visible para propietarios) */}
              {excludedParticipants.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h5 style={{ color: '#374151', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Excluidos de la división ({excludedParticipants.length})
                  </h5>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {excludedParticipants.map((participant, index) => (
                      <div
                        key={participant.email}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
                          borderBottom: '1px solid #e5e7eb'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', color: '#6b7280' }}>
                            {participant.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {participant.email}
                          </div>
                        </div>
                        <button
                          onClick={() => readdToPaymentSplit(participant.email)}
                          style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                          title="Reañadir a la división de gastos"
                        >
                          + Añadir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información de gestión para propietarios */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#dbeafe',
                borderRadius: '6px',
                border: '1px solid #93c5fd'
              }}>
                <p style={{
                  color: '#1e40af',
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}>
                  <strong>Eres el propietario</strong> - Puedes gestionar todos los pagos y participantes de la división.
                  Los demás usuarios solo verán su información personal.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Estados de carga y error
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

  // Render principal de la aplicación
  return (
    <div className="elegant-app-container" style={{
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      display: 'flex',
      flexDirection: 'column'
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

      {/* Barra de navegación */}
      <nav style={{
        backgroundColor: '#F0F9FF',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        padding: '16px 0',
        flexShrink: 0,
        width: '100%',
        position: 'relative',
        zIndex: 100
      }}>
        <div className="navbar-content" style={{
          maxWidth: '100%',
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

      {/* Contenido principal */}
      <main className="elegant-main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%',
        margin: '0',
        padding: '0'
      }}>
        <div className="elegant-content-card" style={{
          backgroundColor: '#F0F9FF',
          borderRadius: '0',
          boxShadow: 'none',
          padding: '24px',
          margin: '0',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 80px)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Creador elegante de listas */}
          <ElegantListCreator />

          {/* Selector de lista elegante */}
          {allLists.length > 0 && (
            <div className="elegant-list-selector" style={{
              marginBottom: '24px',
              width: '100%'
            }}>
              <div className="selector-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px',
                width: '100%'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1F2937',
                  margin: 0
                }}>
                  Seleccionar Lista
                </h3>

                <div className="list-actions" style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={openShareDialog}
                    disabled={!currentList || loading || isCurrentListShared()}
                    className="elegant-action-btn"
                    title={isCurrentListShared() ? "No puedes compartir una lista compartida" : "Compartir lista"}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #5f94ffff',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: isCurrentListShared() ? 'not-allowed' : 'pointer',
                      opacity: isCurrentListShared() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      minWidth: 'fit-content',
                      color: "black",
                      borderColor: "#5f94ffff"
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
                      borderColor: !isCurrentListOwned() ? '#E5E7EB' : '#FECACA',
                      minWidth: 'fit-content'
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
                  cursor: 'pointer',
                  boxSizing: 'border-box'
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
                  border: '1px solid #E2E8F0',
                  width: '100%',
                  boxSizing: 'border-box'
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
              color: '#6B7280',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%'
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '16px', opacity: 0.5 }}>
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>No tienes listas creadas</h3>
              <p style={{ fontSize: '16px' }}>Crea tu primera lista para empezar a organizar tus compras</p>
            </div>
          )}

          {/* Sección de items - SOLO se muestra si hay una lista seleccionada */}
          {currentList && (
            <div className="elegant-items-section" style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%'
            }}>
              <div className="section-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px',
                width: '100%',
                padding: '0 8px' // Espacio lateral en el header
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
                    borderRadius: '20px',
                    flexShrink: 0
                  }}>
                    {pendingItems.length} pendientes • {completedItems.length} comprados
                  </div>
                )}
              </div>

              {/* Añadir items elegante */}
              <div style={{ padding: '0 8px' }}> {/* Espacio lateral para el adder */}
                <ElegantItemAdder />
              </div>

              {/* Lista de items */}
              {items.length > 0 ? (
                <div className="elegant-items-container" style={{
                  flex: 1,
                  overflow: 'auto',
                  width: '100%',
                  padding: '0 8px', // Espacio lateral en el contenedor
                  boxSizing: 'border-box'
                }}>
                  {/* Items pendientes agrupados por categoría */}
                  {Object.keys(groupedPendingItems).map(category => {
                    const categoryInfo = getCategoryInfo(category);
                    return (
                      <div key={`category-${category}`} className="category-section" style={{ width: '100%' }}>
                        <div className="category-header" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          backgroundColor: `${categoryInfo.color}99`,
                          borderLeft: `4px solid ${categoryInfo.color}`,
                          borderRadius: '8px',
                          margin: '16px 0 8px 0',
                          flexWrap: 'wrap',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <span style={{
                            fontSize: '18px',
                            flexShrink: 0
                          }}>
                            {categoryInfo.icon}
                          </span>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: 'white',
                            margin: 0,
                            flex: '1 1 auto',
                            minWidth: '120px'
                          }}>
                            {categoryInfo.name}
                          </h4>
                          {/* CONTADOR ELIMINADO - Solo queda el nombre de la categoría */}
                        </div>
                        <ul className="elegant-items-list" style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          width: '100%'
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
                    <div className="completed-section" style={{ width: '100%' }}>
                      <div className="category-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 16px',
                        backgroundColor: '#10B98199',
                        borderLeft: '4px solid #10B981',
                        borderRadius: '8px',
                        margin: '24px 0 8px 0',
                        flexWrap: 'wrap',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <span style={{
                          fontSize: '18px',
                          flexShrink: 0
                        }}>
                          ✅
                        </span>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: 'white',
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
                        gap: '12px',
                        width: '100%'
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
                  minHeight: '200px',
                  flex: 1,
                  width: '100%',
                  padding: '0 8px', // Espacio lateral también en estado vacío
                  boxSizing: 'border-box'
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
      </main>

      {/* Modal de Compartir */}
      {shareDialogOpen && (
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
                Compartir Lista
              </h3>
              <button
                onClick={() => {
                  setShareDialogOpen(false);
                  setEmailValidation({ valid: true, message: "" });
                  setEmailToShare("");
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
              {/* Mensaje de validación */}
              {emailValidation.message && (
                <div
                  className={`validation-message ${emailValidation.valid ? 'success' : 'error'}`}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    backgroundColor: emailValidation.valid ? "#f0f9ff" : "#fef2f2",
                    color: emailValidation.valid ? "#0369a1" : "#dc2626",
                    border: `1px solid ${emailValidation.valid ? "#bae6fd" : "#fecaca"}`,
                    fontSize: "14px"
                  }}
                >
                  {emailValidation.message}
                </div>
              )}

              <div className="share-input" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
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
                    flex: 1,
                    padding: '12px',
                    border: `1px solid ${emailValidation.valid ? '#d1d5db' : '#dc2626'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    color: '#1f2937',
                    outline: 'none'
                  }}
                  disabled={loading}
                />
                <button
                  onClick={shareList}
                  disabled={loading || !emailToShare.trim()}
                  className="blue-button"
                  style={{
                    backgroundColor: loading || !emailToShare.trim() ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    cursor: loading || !emailToShare.trim() ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    minWidth: '100px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && emailToShare.trim()) {
                      e.target.style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading && emailToShare.trim()) {
                      e.target.style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  {loading ? "Compartiendo..." : "Compartir"}
                </button>
              </div>

              {/* Información adicional */}
              <div className="share-info" style={{
                marginTop: "20px",
                fontSize: "0.9rem",
                color: "#6b7280",
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ margin: '0 0 8px 0' }}>• El usuario recibirá acceso a esta lista</p>
                <p style={{ margin: '0 0 8px 0' }}>• Podrá añadir, marcar y eliminar productos</p>
                <p style={{ margin: '0' }}>• Solo el propietario puede eliminar la lista</p>
              </div>

              {sharedUsers.length > 0 && (
                <div className="shared-users" style={{ marginTop: '20px' }}>
                  <h4 style={{
                    color: "#1f2937",
                    marginBottom: '12px',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}>
                    Compartido con:
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {sharedUsers.map((email, index) => (
                      <li key={`shared-${email || index}`} style={{
                        color: "#1f2937",
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <span>{email}</span>
                        <button
                          onClick={() => {
                            setUserToUnshare(email);
                            setUnshareDialogOpen(true);
                            setShareDialogOpen(false);
                          }}
                          className="unshare-btn"
                          disabled={loading}
                          style={{
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          Eliminar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                onClick={() => {
                  setShareDialogOpen(false);
                  setEmailValidation({ valid: true, message: "" });
                  setEmailToShare("");
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
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Dejar de Compartir */}
      {unshareDialogOpen && (
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
            maxWidth: '400px',
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
                Dejar de compartir
              </h3>
              <button
                onClick={() => {
                  setUnshareDialogOpen(false);
                  setShareDialogOpen(true);
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
              <p style={{
                color: "#1f2937",
                margin: 0,
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                ¿Dejar de compartir la lista con <strong>{userToUnshare}</strong>?
              </p>
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
                onClick={() => {
                  setUnshareDialogOpen(false);
                  setShareDialogOpen(true);
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
                onClick={unshareList}
                disabled={loading}
                className="confirm-delete-btn"
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  minWidth: '100px'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#ef4444';
                  }
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Item */}
      {confirmDelete && (
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
            maxWidth: '400px',
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
                Confirmar eliminación
              </h3>
              <button
                onClick={() => setConfirmDelete(null)}
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
              <p style={{
                color: "#1f2937",
                margin: 0,
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                ¿Eliminar "<strong>{confirmDelete.text}</strong>"?
              </p>
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
                onClick={() => setConfirmDelete(null)}
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
                onClick={() => deleteItem(confirmDelete.id)}
                className="confirm-delete-btn"
                style={{
                  backgroundColor: '#ef4444',
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
                  e.target.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ef4444';
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación de Lista */}
      {confirmListDelete && (
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
            maxWidth: '450px',
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
                Confirmar eliminación
              </h3>
              <button
                onClick={() => setConfirmListDelete(null)}
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
              <p style={{
                color: "#1f2937",
                margin: 0,
                fontSize: '16px',
                lineHeight: '1.5'
              }}>
                ¿Eliminar la lista "<strong>{confirmListDelete.name}</strong>" y todos sus productos?
              </p>
              <p style={{
                color: "#ef4444",
                margin: '12px 0 0 0',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Esta acción no se puede deshacer
              </p>
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
                onClick={() => setConfirmListDelete(null)}
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
                  deleteList(confirmListDelete.id);
                }}
                className="confirm-delete-btn"
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  minWidth: '100px'
                }}
                disabled={loading}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#ef4444';
                  }
                }}
              >
                {loading ? "Eliminando..." : "Eliminar"}
              </button>
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
                min="0"
                value={purchaseInfo[currentList]?.totalPrice?.toString() || ""}
                onChange={(e) => {
                  const price = e.target.value;
                  setPurchaseInfo(prev => ({
                    ...prev,
                    [currentList]: price ? {
                      ...prev[currentList],
                      totalPrice: parseFloat(price)
                    } : null
                  }));
                }}
                placeholder="Precio total (ej: 45.50)"
                className="elegant-input"
                style={{
                  color: 'black',
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />

              {purchaseInfo[currentList]?.totalPrice && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd'
                }}>
                  <p style={{
                    color: '#0369a1',
                    margin: 0,
                    fontSize: '14px'
                  }}>
                    💡 El precio total se mostrará en la información de la lista y podrás usarlo para dividir gastos.
                  </p>
                </div>
              )}
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
                  minWidth: '100px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                }}
              >
                {purchaseInfo[currentList]?.totalPrice ? 'Guardar Precio' : 'Eliminar Precio'}
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

      {/* Modal de División de Gastos */}
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

            <SplitDialogContent />

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
          flex-shrink: 0;
          width: 100%;
        }
        
        .navbar-content {
          max-width: 100%;
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
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 100%;
          margin: 0;
          padding: 0;
          width: 100%;
        }
        
        .elegant-content-card {
          background-color: var(--white);
          border-radius: 0;
          box-shadow: none;
          padding: 24px;
          margin-bottom: 0;
          flex: 1;
          display: flex;
          flexDirection: column;
          minHeight: calc(100vh - 80px);
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
          flex: 1;
          display: flex;
          flexDirection: column;
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
          borderRadius: 8px;
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
        
        /* Responsive para móviles */
        @media (max-width: 768px) {
    .elegant-content-card {
      padding: 12px;
      margin: 0;
      border-radius: 0;
    }
    
    .elegant-list-creator {
      flex-direction: column;
      padding: 12px;
      margin-bottom: 16px;
    }
    
    .elegant-list-creator input {
      min-width: 100%;
      margin-bottom: 8px;
    }
    
    .selector-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    
    .list-actions {
      justify-content: space-between;
      width: 100%;
    }
    
    .elegant-item-adder {
      flex-direction: column;
    }
    
    .elegant-item-adder input {
      min-width: 100%;
      margin-bottom: 8px;
    }
    
    .elegant-item {
      flex-direction: column;
      align-items: flex-start;
      padding: 12px;
    }
    
    .item-content {
      width: 100%;
      margin-bottom: 8px;
    }
    
    .item-actions {
      width: 100%;
      justify-content: flex-end;
    }
    
    .category-header {
      padding: 10px 12px;
      flex-direction: row;
      align-items: center;
    }
    
    .category-header h4 {
      font-size: 14px;
    }
    
    .dialog-modal {
      width: 95% !important;
      margin: 10px;
    }
    
    .navbar-content {
      flex-direction: column;
      text-align: center;
    }
  }
        
        @media (max-width: 480px) {
    .elegant-content-card {
      padding: 8px;
    }
    
    .elegant-list-creator,
    .elegant-item-adder {
      padding: 10px;
    }
    
    .elegant-input,
    .elegant-select {
      font-size: 14px;
      padding: 10px 12px;
    }
    
    .elegant-create-btn,
    .elegant-add-btn {
      padding: 10px 16px;
      font-size: 14px;
    }
    
    .item-text {
      font-size: 14px;
    }
    
    .category-header {
      padding: 8px 10px;
    }
    
    .category-header h4 {
      font-size: 13px;
    }
  }

        /* Para pantallas grandes */
        @media (min-width: 769px) and (max-width: 1024px) {
    .elegant-content-card {
      padding: 20px;
      margin: 0 auto;
      max-width: 95%;
    }
    
    .elegant-list-creator {
      flex-wrap: nowrap;
    }
  }
  
  @media (min-width: 1025px) {
    .elegant-content-card {
      max-width: 1200px;
      margin: 0 auto 32px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .elegant-main-content {
      padding: 0 20px;
    }
  }
  
  /* Asegurar que todos los contenedores sean responsive */
  .elegant-app-container,
  .elegant-main-content,
  .elegant-content-card {
    width: 100%;
    max-width: 100%;
  }
  
  /* Mejorar el scroll en móviles */
  .elegant-items-container {
    -webkit-overflow-scrolling: touch;
  }

        /* Mejoras de accesibilidad */
        @media (prefers-reduced-motion: reduce) {
          .elegant-item {
            transition: none;
          }
          
          .elegant-item:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
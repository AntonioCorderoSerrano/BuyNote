import React from 'react';
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, deleteDoc, writeBatch, getDocs, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { BarcodeScanner } from '@ionic-native/barcode-scanner';

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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortByPurchased, setSortByPurchased] = useState(false);
  const allLists = [...lists, ...sharedLists];
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const scannerRef = useRef(null);
  const [userPremium, setUserPremium] = useState(false);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [adBlockDetected, setAdBlockDetected] = useState(false);


  // Verificar si el usuario tiene premium
  useEffect(() => {
    const checkPremiumStatus = async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().premium) {
          setUserPremium(true);
        }
      } catch (err) {
        console.error("Error checking premium status:", err);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserReady(true);
        loadInitialData(user);
        checkPremiumStatus(user);
      } else {
        setUserReady(false);
        resetState();
        setUserPremium(false);
      }
    });

    return unsubscribe;
  }, []);

  // Cargar PayPal SDK
  useEffect(() => {
    if (!paypalLoaded && !userPremium) {
      loadPaypalScript();
    }
  }, [paypalLoaded, userPremium]);

  const loadPaypalScript = async () => {
    try {
      await loadScript({
        "client-id": "AdT9pWzaT4MXaJuBE4ECgqLXcnD9kEqMxKUCrU8lGqD32B1XtzeqaPnmpzcuww3YArkAg2ZYCIIPIOIe",
        currency: "EUR",
        "disable-funding": "credit,card",
      });
      setPaypalLoaded(true);
    } catch (error) {
      console.error("Failed to load PayPal JS SDK script", error);
    }
  };

  // Detectar AdBlock
  useEffect(() => {
    const checkAdBlock = () => {
      const fakeAd = document.createElement('div');
      fakeAd.className = 'ad-class';
      fakeAd.style.height = '1px';
      document.body.appendChild(fakeAd);

      setTimeout(() => {
        if (fakeAd.offsetHeight === 0) {
          setAdBlockDetected(true);
          if (!userPremium) {
            alert("Hemos detectado un bloqueador de anuncios. Para usar la aplicación sin anuncios, considera actualizar a la versión premium.");
          }
        }
        document.body.removeChild(fakeAd);
      }, 100);
    };

    if (!userPremium) {
      checkAdBlock();
      const interval = setInterval(checkAdBlock, 30000); // Verificar cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [userPremium]);

  // Mostrar anuncios si no es premium
  useEffect(() => {
    if (!userPremium && !adBlockDetected) {
      // Inicializar anuncios
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  }, [userPremium, adBlockDetected]);

  // Función para suscribirse al plan premium
  const handlePremiumSubscription = () => {
    if (!paypalLoaded) return;

    window.paypal.Buttons({
      createSubscription: function (data, actions) {
        return actions.subscription.create({
          'plan_id': 'P-13U06603S35467107NAHJG5A' // ID de tu plan en PayPal
        });
      },
      onApprove: async function (data, actions) {
        try {
          // Guardar la suscripción en Firestore
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            premium: true,
            subscriptionId: data.subscriptionID,
            premiumSince: new Date()
          });

          setUserPremium(true);
          setShowPremiumModal(false);
          alert("¡Gracias por suscribirte a la versión premium!");
        } catch (err) {
          console.error("Error saving premium status:", err);
          alert("Hubo un error al activar tu suscripción. Por favor, contacta con soporte.");
        }
      },
      onError: function (err) {
        console.error("PayPal error:", err);
        alert("Hubo un error al procesar el pago. Por favor, inténtalo de nuevo.");
      }
    }).render('#paypal-button-container');
  };



  // Limpiar el escáner al desmontar el componente
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  // Categorías disponibles
  const CATEGORIES = {
    "DAIRY": [
      "leche", "queso", "yogur", "mantequilla", "nata", "crema",
      "queso crema", "leche condensada", "leche evaporada", "requesón", "kefir", "batido de leche"
    ],
    "BEVERAGES": [
      "agua", "refresco", "zumo", "jugo", "cerveza", "vino", "café", "té",
      "bebida energética", "batido", "licor", "kombucha", "agua con gas", "horchata", "infusión"
    ],
    "MEAT": [
      "pollo", "ternera", "cerdo", "pavo", "cordero", "chuleta", "filete", "salchicha",
      "jamón", "bacon", "costilla", "albóndigas", "chorizo", "morcilla", "lomo", "hamburguesa"
    ],
    "FRUITS_VEGETABLES": [
      "manzana", "plátano", "naranja", "lechuga", "tomate", "zanahoria", "cebolla", "pimiento",
      "pera", "kiwi", "melón", "sandía", "piña", "fresa", "espinaca", "brócoli", "coliflor",
      "ajo", "pepino", "calabacín", "berenjena", "aguacate", "uvas", "champiñones"
    ],
    "BAKERY": [
      "pan", "bollo", "baguette", "tostada", "croissant", "galleta",
      "magdalena", "bizcocho", "donut", "empanada", "pan integral", "pan de molde"
    ],
    "CLEANING": [
      "jabón", "detergente", "limpiador", "lejía", "esponja", "papel higiénico",
      "limpiacristales", "lavavajillas", "suavizante", "desinfectante", "guantes", "fregasuelos"
    ],
    "CONGELADOS": [
      "helado", "pizza", "verduras congeladas", "pescado congelado",
      "croquetas", "nuggets", "empanadillas", "lasaña congelada", "tarta helada", "pan congelado"
    ],
    "SNACKS": [
      "patatas fritas", "gusanitos", "palomitas", "barritas energéticas", "galletas saladas",
      "chocolate", "caramelos", "chicles", "turrón", "bombones", "frutos secos"
    ],
    "CANNED": [
      "atún en lata", "maíz en lata", "sardinas", "tomate triturado", "alubias en conserva",
      "garbanzos en lata", "pimientos asados", "olivas", "fruta en almíbar", "paté"
    ],
    "GRAINS_PASTA": [
      "arroz", "pasta", "espaguetis", "macarrones", "quinoa", "cuscús",
      "harina", "sémola", "copos de avena", "pan rallado", "fideos"
    ],
    "SAUCES_SPICES": [
      "sal", "azúcar", "pimienta", "orégano", "vinagre", "aceite de oliva", "aceite de girasol",
      "salsa de tomate", "mayonesa", "ketchup", "mostaza", "salsa barbacoa", "caldo concentrado", "curry"
    ],
    "PERSONAL_CARE": [
      "champú", "gel de baño", "desodorante", "pasta de dientes", "cepillo de dientes",
      "maquinilla de afeitar", "cuchillas", "papel higiénico", "pañuelos", "toallitas"
    ],
    "PET": [
      "comida para perros", "comida para gatos", "arena para gatos", "huesos", "snacks para mascotas",
      "juguetes para mascotas", "collar", "champú para mascotas"
    ],
    "BABY": [
      "pañales", "toallitas húmedas", "papilla", "leche infantil", "biberones", "crema para bebés"
    ],
    "OTHER": [
      "pilas", "velas", "encendedor", "bolsas de basura", "revista", "cuaderno", "bombilla"
    ]
  };

  const detectCategory = (productName) => {
    const lowerName = productName.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORIES)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    return "OTHER"; // Categoría por defecto si no coincide con ninguna
  };

  // Referencias para mantener datos entre renders sin recargar
  const itemsCache = useRef({});
  const listsCache = useRef({ userLists: [], sharedLists: [] });

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

      // Inicializar cachés si están vacías
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

      // Usar los datos del cache para establecer el estado inicial
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

      // Actualizar cache primero
      listsCache.current.userLists = userLists;

      // Luego actualizar estado
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
      const sharedListsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Actualizar cache primero
      listsCache.current.sharedLists = sharedListsData;

      // Luego actualizar estado
      setSharedLists(sharedListsData);
    });

    return unsubscribe;
  };

  // Efecto optimizado para items con cache local
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
      const updatedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Actualizar cache primero para evitar parpadeos
      itemsCache.current = {
        ...itemsCache.current,
        [currentList]: updatedItems
      };

      // Usar setTimeout para dar tiempo al renderizado
      setTimeout(() => {
        setItems(updatedItems);
      }, 50);
    });

    // Cargar items desde cache si existen
    if (itemsCache.current[currentList]) {
      setItems(itemsCache.current[currentList]);
    }

    return unsubscribe;
  }, [currentList]);

  // Funciones optimizadas con delays para mejor UX
  const createList = async () => {
    if (!auth.currentUser?.uid || !newListName.trim()) return;

    try {
      // 1. Crear lista temporal optimista
      const tempId = `temp-${Date.now()}`;
      const tempList = {
        id: tempId,
        name: newListName,
        userId: auth.currentUser.uid,
        sharedWith: [],
        createdAt: new Date(),
        isOptimistic: true // Marcar como temporal
      };

      // Actualizar estado inmediatamente (Optimistic UI)
      setLists(prev => [...prev, tempList]);
      setCurrentList(tempId);
      setNewListName("");

      // 2. Crear la lista en Firebase (en segundo plano)
      const docRef = await addDoc(collection(db, "lists"), {
        name: newListName,
        userId: auth.currentUser.uid,
        sharedWith: [],
        createdAt: new Date()
      });

      // 3. Reemplazar la lista temporal con la real
      setLists(prev =>
        prev.map(list =>
          list.id === tempId
            ? { ...list, id: docRef.id, isOptimistic: false }
            : list
        )
      );

      setCurrentList(docRef.id);

    } catch (err) {
      console.error("Error creando lista:", err);

      // Revertir cambios si falla
      setLists(prev => prev.filter(list => list.id !== tempId));

      // Si estábamos mostrando esta lista temporal, volver a la anterior
      if (currentList === tempId) {
        setCurrentList(lists[0]?.id || "");
      }

      setError(`Error al crear lista: ${err.message}`);
    }
  };

  const addItem = async () => {
    if (!userReady || !auth.currentUser?.uid || !currentList || !newItem.trim()) return;

    try {
      // Optimistic UI update
      const tempId = `temp-item-${Date.now()}`;
      const detectedCategory = detectCategory(newItem);
      const newItemObj = {
        id: tempId,
        text: newItem,
        listId: currentList,
        userId: auth.currentUser.uid,
        completed: false,
        category: detectedCategory, // Asignar categoría automáticamente
        createdAt: new Date()
      };

      setItems(prev => [...prev, newItemObj]);
      setNewItem("");

      await new Promise(resolve => setTimeout(resolve, 200));

      await addDoc(collection(db, "items"), {
        text: newItemObj.text,
        listId: currentList,
        userId: auth.currentUser.uid,
        completed: false,
        category: newItemObj.category,
        createdAt: new Date()
      });

    } catch (err) {
      console.error("Error añadiendo producto:", err);
      setItems(prev => prev.filter(item => item.id !== tempId));
      setError(`Error al añadir producto: ${err.message}`);
    }
  };

  const deleteItem = async (id) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, "items", id));
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
      // Verifica propiedad antes de eliminar
      const listDoc = await getDoc(doc(db, "lists", listId));
      if (listDoc.data()?.userId !== auth.currentUser.uid) {
        throw new Error("Solo el dueño puede eliminar la lista");
      }

      const batch = writeBatch(db);

      // Elimina items primero
      const itemsQuery = query(collection(db, "items"), where("listId", "==", listId));
      const itemsSnapshot = await getDocs(itemsQuery);

      itemsSnapshot.forEach((itemDoc) => {
        batch.delete(doc(db, "items", itemDoc.id));
      });

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

  const shareList = async () => {
    if (!userPremium) {
      setShowPremiumModal(true);
      return;
    }

    if (!currentList || !emailToShare.trim() || !auth.currentUser?.uid) return;

    try {
      const tempSharedUsers = [...sharedUsers, emailToShare];
      setSharedUsers(tempSharedUsers);

      await updateDoc(doc(db, "lists", currentList), {
        sharedWith: arrayUnion(emailToShare)
      });

      setEmailToShare("");
      setShareDialogOpen(false);
    } catch (err) {
      console.error("Error compartiendo lista:", err);
      setSharedUsers(sharedUsers.filter(email => email !== emailToShare));
      setError(`Error al compartir: ${err.message}`);
    }
  };

  const unshareList = async () => {
    if (!currentList || !userToUnshare) return;

    try {
      // Optimistic UI: Eliminar email de sharedWith inmediatamente
      const tempSharedUsers = sharedUsers.filter(email => email !== userToUnshare);
      setSharedUsers(tempSharedUsers);

      // Actualizar la lista localmente
      setLists(prev => prev.map(list =>
        list.id === currentList
          ? { ...list, sharedWith: tempSharedUsers }
          : list
      ));

      // Operación real en Firebase
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
      // Revertir cambios si falla
      setSharedUsers([...sharedUsers, userToUnshare]);
      setError(`Error al eliminar compartido: ${err.message}`);
    }
  };

  const toggleItemCompletion = async (itemId, currentStatus) => {
    try {
      const currentItem = items.find(item => item.id === itemId);
      if (!currentItem) return;

      // Determinar nueva categoría
      const newCategory = currentStatus ? currentItem.originalCategory || currentItem.category : "COMPRADO";

      // Actualizar estado local
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? {
            ...item,
            completed: !currentStatus,
            category: newCategory,
            // Guardar la categoría original si estamos marcando como completado
            originalCategory: currentStatus ? item.originalCategory : currentItem.category
          }
          : item
      ));

      // Actualizar en Firebase
      const itemRef = doc(db, "items", itemId);
      await updateDoc(itemRef, {
        completed: !currentStatus,
        category: newCategory,
        originalCategory: currentStatus ? currentItem.originalCategory : currentItem.category
      });

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

  const sortedItems = [...items].sort((a, b) => {
    // Primero separar por completado (no completados primero)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    // Luego ordenar por categoría
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }

    // Finalmente ordenar por texto
    return a.text.localeCompare(b.text);
  });



  // Renderizar anuncios en el componente
  const renderAds = () => {
    if (userPremium || adBlockDetected) return null;

    return (
      <>
        {/* Banner superior */}
        <div className="ad-container top-ad">
          <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-2283199580734396"
            data-ad-slot="TU_SLOT_BANNER_SUPERIOR"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        </div>

        {/* Banner lateral (solo en desktop) */}
        <div className="ad-container side-ad">
          <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-2283199580734396"
            data-ad-slot="TU_SLOT_BANNER_LATERAL"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        </div>
      </>
    );
  };

  // Renderizar modal premium
  const renderPremiumModal = () => {
    if (!showPremiumModal) return null;

    return (
      <div className="modal-overlay">
        <div className="premium-modal" style={{ backgroundColor: "white" }}>
          <h3 style={{ color: "black" }}>Actualiza a Premium</h3>
          <p style={{ color: "black" }}>
            La función de compartir listas está disponible solo para usuarios premium.
            Suscríbete por solo 4.99€/mes y disfruta de:
          </p>
          <ul style={{ color: "black", textAlign: "left", margin: "15px 0" }}>
            <li>Compartir listas con otros usuarios</li>
            <li>Experiencia sin anuncios</li>
            <li>Soporte prioritario</li>
            <li>Funciones exclusivas</li>
          </ul>

          <div id="paypal-button-container" style={{ margin: "20px 0" }}></div>

          <button
            onClick={() => setShowPremiumModal(false)}
            className="cancel-btn"
            style={{ color: "black" }}
          >
            Quizá más tarde
          </button>
        </div>
      </div>
    );
  };


  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Cargando...</p>
    </div>
  );

  if (error) return (
    <div className="error-screen">
      <p>Error: {error}</p>
      <button onClick={() => setError(null)}>Reintentar</button>
    </div>
  );

  return (
    <div className="app-container">
      <nav className="app-navbar" style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}>
        <div className="logo-container">
          <img
            src="/logo.png"
            alt="BuyNote Logo"
            width="60"
            height="60"
            style={{ objectFit: 'contain' }}
          />
          <span className="app-name" style={{ color: "black" }}>BuyNote</span>
        </div>
        <button
          className="logout-btn"
          onClick={() => signOut(auth)}
          title="Cerrar sesión"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="#1e88e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 17L21 12L16 7" stroke="#1e88e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" stroke="#1e88e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </nav>

      {renderAds()}

      <div className="main-content">
        <div className="content-card" style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}>
          <div className="list-creation">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nombre de nueva lista"
              className="elegant-input"
              style={{ color: "black", placeholder: "darkgray" }}
            />
            <button
              onClick={createList}
              disabled={loading || !newListName.trim()}
              className="add-button"
              title="Crear nueva lista"
              color="blue"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20M4 12H20" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {allLists.length > 0 ? (
            <div className="list-selector-container">
              <div className="list-selector">
                <select
                  value={currentList}
                  onChange={(e) => setCurrentList(e.target.value)}
                  disabled={loading}
                  className="elegant-select"
                  style={{ color: "black" }}
                >
                  <option value="" disabled hidden style={{ color: "darkgray" }}>
                    Selecciona una lista para ver sus productos
                  </option>

                  <optgroup label="Mis listas" style={{ color: "black" }}>
                    {lists.map((list, index) => (
                      <option key={`my-${list.id || index}`} value={list.id} style={{ color: "black" }}>
                        {list.name}
                      </option>
                    ))}
                  </optgroup>

                  {sharedLists.length > 0 && (
                    <optgroup label="Listas compartidas conmigo" style={{ color: "black" }}>
                      {sharedLists.map((list, index) => (
                        <option key={`shared-${list.id || index}`} value={list.id} style={{ color: "black" }}>
                          {list.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="list-actions">
                  <button
                    onClick={openShareDialog}
                    disabled={!currentList || loading || sharedLists.some(list => list.id === currentList)}
                    className="action-btn share-btn"
                    title="Compartir lista"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 5.12548 15.0077 5.24919 15.0227 5.37061L8.0826 9.84066C7.54305 9.32015 6.80879 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15C6.80879 15 7.54305 14.6798 8.0826 14.1593L15.0227 18.6294C15.0077 18.7508 15 18.8745 15 19C15 20.6569 16.3431 22 18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C17.1912 16 16.4569 16.3202 15.9174 16.8407L8.97727 12.3706C8.99229 12.2492 9 12.1255 9 12C9 11.8745 8.99229 11.7508 8.97727 11.6294L15.9174 7.15934C16.4569 7.67985 17.1912 8 18 8Z" fill="#1e88e5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => currentList && setConfirmListDelete(allLists.find(l => l.id === currentList))}
                    disabled={!currentList || loading || sharedLists.some(list => list.id === currentList)}
                    className="action-btn delete-btn"
                    title="Eliminar lista"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="#c62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="no-lists-message" style={{ color: "black" }}>No tienes listas creadas</p>
          )}

          {shareDialogOpen && (
            <div className="modal-overlay">
              <div className="share-modal" style={{ backgroundColor: "white" }}>
                <h3 style={{ color: "black" }}>Compartir lista</h3>
                <div className="share-input">
                  <input
                    type="email"
                    value={emailToShare}
                    onChange={(e) => setEmailToShare(e.target.value)}
                    placeholder="Introduce el email"
                    className="elegant-input"
                    style={{ color: "black", placeholder: "darkgray" }}
                  />
                  <button
                    onClick={shareList}
                    disabled={loading || !emailToShare.trim()}
                    className="blue-button"
                    style={{ backgroundColor: "green" }}
                  >
                    Compartir
                  </button>
                </div>
                {sharedUsers.length > 0 && (
                  <div className="shared-users">
                    <h4 style={{ color: "black" }}>Compartido con:</h4>
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
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => setShareDialogOpen(false)}
                  className="cancel-btn"
                  style={{ color: "black" }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {unshareDialogOpen && (
            <div className="modal-overlay">
              <div className="confirmation-modal" style={{ backgroundColor: "white" }}>
                <p style={{ color: "black" }}>¿Dejar de compartir la lista con {userToUnshare}?</p>
                <div className="modal-buttons">
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

          {currentList && (
            <div className="items-section">
              <div className="items-header">
                <h3 style={{ color: "black" }}>Productos</h3>
              </div>

              <div className="item-input-container">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Nuevo producto"
                  className="elegant-input"
                  onKeyPress={(e) => e.key === 'Enter' && addItem()}
                  style={{ color: "black", placeholder: "darkgray" }}
                />
                <button
                  onClick={addItem}
                  disabled={!newItem.trim()}
                  className="add-button"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V20M4 12H20" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <ul className="items-list">
                {/* Items no completados agrupados por categoría */}
                {sortedItems
                  .filter(item => !item.completed)
                  .map((item, index, filteredArray) => {
                    const showCategoryHeader = index === 0 ||
                      item.category !== filteredArray[index - 1].category;

                    return (
                      <React.Fragment key={`item-${item.id}`}>
                        {showCategoryHeader && (
                          <li className="category-header">
                            <span style={{ color: "black" }}>
                              {item.category === "FRUITS_VEGETABLES" && "Frutas y verduras"}
                              {item.category === "MEAT" && "Carne"}
                              {item.category === "FISH" && "Pescado"} {/* Por si luego lo agregas */}
                              {item.category === "DAIRY" && "Lácteos"}
                              {item.category === "BAKERY" && "Panadería"}
                              {item.category === "CLEANING" && "Limpieza"}
                              {item.category === "BEVERAGES" && "Bebidas"}
                              {item.category === "CONGELADOS" && "Congelados"}
                              {item.category === "SNACKS" && "Snacks"}
                              {item.category === "CANNED" && "Conservas"}
                              {item.category === "GRAINS_PASTA" && "Arroces y pastas"}
                              {item.category === "SAUCES_SPICES" && "Salsas y especias"}
                              {item.category === "PERSONAL_CARE" && "Higiene personal"}
                              {item.category === "PET" && "Mascotas"}
                              {item.category === "BABY" && "Bebé"}
                              {item.category === "PANTRY" && "Despensa"} {/* Por si la usas */}
                              {item.category === "OTHER" && "Otros"}
                            </span>
                          </li>
                        )}
                        <li className="item-card">
                          <div className="item-content">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleItemCompletion(item.id, item.completed);
                              }}
                              className="item-checkbox"
                              disabled={loading}
                            />
                            <span className="item-text" style={{ color: "black" }}>
                              {item.text}
                            </span>
                          </div>
                          <button
                            onClick={() => setConfirmDelete(item)}
                            disabled={loading}
                            className="delete-item-btn"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="#c62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </li>
                      </React.Fragment>
                    );
                  })}

                {/* Sección de COMPRADO (solo si hay items completados) */}
                {sortedItems.some(item => item.completed) && (
                  <>
                    <li className="category-header completed-header">
                      <span style={{ color: "black" }}>COMPRADO</span>
                    </li>
                    {sortedItems
                      .filter(item => item.completed)
                      .map(item => (
                        <li key={`completed-${item.id}`} className="item-card completed">
                          <div className="item-content">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleItemCompletion(item.id, item.completed);
                              }}
                              className="item-checkbox"
                              disabled={loading}
                            />
                            <span className="item-text strikethrough" style={{ color: "black" }}>
                              {item.text}
                            </span>
                          </div>
                          <button
                            onClick={() => setConfirmDelete(item)}
                            disabled={loading}
                            className="delete-item-btn"
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="#c62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </li>
                      ))}
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {renderPremiumModal()}

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="confirmation-modal" style={{ backgroundColor: "white" }}>
            <p style={{ color: "black" }}>¿Eliminar "{confirmDelete.text}"?</p>
            <div className="modal-buttons">
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

      {confirmListDelete && (
        <div className="modal-overlay">
          <div className="confirmation-modal" style={{ backgroundColor: "white" }}>
            <p style={{ color: "black" }}>¿Eliminar la lista "{confirmListDelete.name}" y todos sus productos?</p>
            <div className="modal-buttons">
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
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4336614010144487"
            crossorigin="anonymous"></script>
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
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .confirmation-modal, .share-modal {
          background-color: var(--white);
          padding: 25px;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e0e0e0;
          margin: 0 auto;
          overflow: hidden;
        }
        
        .confirmation-modal p {
          margin-bottom: 20px;
          font-size: 1.1rem;
          color: var(--text-color);
          word-break: break-word;
        }
        
        .modal-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
        }
        
        .cancel-btn {
          background-color: var(--gray);
          color: var(--dark-gray);
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e0e0e0;
        }
        
        
        .confirm-delete-btn {
          background-color: var(--error-red);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .confirm-delete-btn:hover {
          background-color: #b71c1c;
        }
        
        .share-input {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          width: 100%;
        }
        
        .shared-users {
          margin: 20px 0;
          width: 100%;
        }
        
        .shared-users h4 {
          color: var(--dark-gray);
          margin-bottom: 10px;
          text-align: left;
        }
        
        .shared-users ul {
          list-style: none;
          max-height: 200px;
          overflow-y: auto;
          width: 100%;
          padding: 0;
          margin: 0;
        }
        
        .shared-users li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #eee;
          color: var(--text-color);
          width: 100%;
        }
        
        .unshare-btn {
          background-color: #ffebee;
          color: var(--error-red);
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.3s ease;
          border: 1px solid #ffcdd2;
          white-space: nowrap;
        }
        
        .unshare-btn:hover {
          background-color: #ffcdd2;
        }
        
        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: var(--primary-blue);
          background-color: var(--white);
        }
        
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid var(--light-blue);
          border-top: 5px solid var(--primary-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: var(--error-red);
          background-color: var(--white);
        }
        
        @media (max-width: 768px) {
          .content-card {
            padding: 20px;
          }
          
          .list-creation, .item-input-container, .share-input {
            flex-direction: column;
          }
          
          .list-selector {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          
          .list-actions {
            justify-content: flex-end;
          }
          
          .blue-button, .add-button {
            width: 100%;
          }
          
          .category-select {
            width: 100%;
            min-width: auto;
          }
          
          .shared-users li {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .unshare-btn {
            align-self: flex-end;
          }
        }
        
        @media (max-width: 480px) {
          .app-navbar {
            padding: 10px 15px;
          }
          
          .app-name {
            font-size: 1.2rem;
          }
          
          .content-card {
            padding: 15px;
          }
          
          .modal-buttons {
            flex-direction: column;
            gap: 10px;
          }
          
          .cancel-btn, .confirm-delete-btn, .blue-button {
            width: 100%;
          }
          
          .confirmation-modal, .share-modal {
            padding: 20px 15px;
          }


          .item-card.completed {
            background-color: var(--completed-item);
            opacity: 0.7; /* Hacerlos un poco transparentes */
          }

          /* Estilo para el encabezado de COMPRADO */
          .completed-header {
            margin-top: 20px;
          }

          /* Estilo para items completados */
          .item-card.completed {
            background-color: #f5f5f5;
            opacity: 0.8;
          }

          /* Texto tachado */
          .strikethrough {
            text-decoration: line-through;
            color: #9e9e9e;
          }

          /* Nuevos estilos para anuncios y premium */
        .ad-container {
          margin: 15px auto;
          text-align: center;
          overflow: hidden;
        }
        
        .top-ad {
          width: 100%;
          max-width: 728px;
          height: 90px;
        }
        
        .side-ad {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 160px;
          height: 600px;
          display: none;
        }
        
        .premium-modal {
          max-width: 500px;
          padding: 30px;
          text-align: center;
        }
        
        .premium-btn {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .premium-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .navbar-actions {
          display: flex;
          align-items: center;
        }
        
        @media (min-width: 1200px) {
          .side-ad {
            display: block;
          }
        }
        
        @media (max-width: 768px) {
          .premium-btn {
            padding: 6px 12px;
            font-size: 0.9rem;
            margin-right: 10px;
          }
        }
      `}</style>
    </div>
  );
}
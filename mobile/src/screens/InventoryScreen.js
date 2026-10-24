import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { inventoryApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function InventoryScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [searchText, setSearchText] = useState('');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Item Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemCatId, setItemCatId] = useState(null);
  const [unit, setUnit] = useState('Pcs');
  const [unitPrice, setUnitPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [openingStock, setOpeningStock] = useState('10');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [rackNumber, setRackNumber] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // Detail / Action Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catRes] = await Promise.allSettled([
        inventoryApi.getItems(searchText.trim() ? { search: searchText.trim() } : {}),
        inventoryApi.getCategories(),
      ]);

      if (itemsRes.status === 'fulfilled' && itemsRes.value.data?.success) {
        setItems(itemsRes.value.data.data?.items || itemsRes.value.data.data || []);
      }
      if (catRes.status === 'fulfilled' && catRes.value.data?.success) {
        const catList = catRes.value.data.data || [];
        setCategories(catList);
        if (catList.length > 0 && !itemCatId) {
          setItemCatId(catList[0].id);
        }
      }
    } catch (e) {
      console.warn('Inventory fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [searchText]);

  const handleAddItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('Validation Error', 'Please enter item name.');
      return;
    }
    if (!itemCatId) {
      Alert.alert('Validation Error', 'Please select a category.');
      return;
    }

    try {
      setSavingItem(true);
      const payload = {
        itemName: itemName.trim(),
        categoryId: Number(itemCatId),
        unit: unit.trim() || 'Pcs',
        unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : 0,
        openingStock: openingStock ? parseInt(openingStock, 10) : 0,
        reorderLevel: reorderLevel ? parseInt(reorderLevel, 10) : 5,
        rackNumber: rackNumber.trim() || null,
      };

      const res = await inventoryApi.createItem(payload);
      if (res.data?.success) {
        Alert.alert('Success! 📦', `Item "${itemName}" added to inventory successfully!`);
        setAddModalVisible(false);
        // Reset form
        setItemName('');
        setUnitPrice('');
        setSellingPrice('');
        setOpeningStock('10');
        setReorderLevel('5');
        setRackNumber('');
        loadData();
      } else {
        Alert.alert('Failed', res.data?.message || 'Could not save item.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error creating inventory item.';
      Alert.alert('Error', msg);
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Inventory Item',
      `Are you sure you want to remove "${item.name || item.itemName}" from inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventoryApi.deleteItem(item.id);
              Alert.alert('Deleted', 'Item removed successfully.');
              setDetailModalVisible(false);
              loadData();
            } catch (err) {
              const msg = err.response?.data?.message || 'Failed to delete item.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const filteredItems = items.filter((it) => {
    if (selectedCatId === 'ALL') return true;
    const cId = it.categoryId || it.category?.id;
    return String(cId) === String(selectedCatId);
  });

  const lowStockCount = items.filter((i) => {
    const qty = Number(i.quantityAvailable || i.currentStock || i.stock || 0);
    const min = Number(i.reorderLevel || i.minimumStock || 5);
    return qty <= min;
  }).length;

  const renderItem = ({ item }) => {
    const qty = Number(item.quantityAvailable || item.currentStock || item.stock || 0);
    const min = Number(item.reorderLevel || item.minimumStock || 5);
    const isLow = qty <= min;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedItem(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, isLow && { backgroundColor: isDark ? '#450a0a' : '#fee2e2' }]}>
            <MaterialIcons
              name="inventory-2"
              size={22}
              color={isLow ? '#dc2626' : '#0284c7'}
            />
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.itemName}>{item.name || item.itemName}</Text>
            <Text style={styles.itemMeta}>
              Category: {item.category?.name || item.categoryName || 'General'} • Code: {item.itemCode || 'ITM'}
            </Text>
            {item.unitPrice ? (
              <Text style={styles.itemPrice}>Cost: ₹{Number(item.unitPrice).toLocaleString('en-IN')}</Text>
            ) : null}
          </View>

          <View style={styles.stockCol}>
            <Text style={[styles.stockQty, isLow && { color: '#dc2626' }]}>{qty}</Text>
            <Text style={styles.stockUnit}>{item.unit || 'Units'}</Text>
            {isLow && (
              <View style={styles.lowBadge}>
                <Text style={styles.lowBadgeText}>Low Stock</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items by name or code..."
            placeholderTextColor="#94a3b8"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={loadData}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); loadData(); }}>
              <MaterialIcons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Overview Stat Badges */}
      <View style={styles.statsBar}>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>Total Items: </Text>
          <Text style={styles.statVal}>{items.length}</Text>
        </View>
        {lowStockCount > 0 && (
          <View style={[styles.statChip, styles.statChipDanger]}>
            <MaterialIcons name="warning" size={13} color="#dc2626" />
            <Text style={styles.statDangerText}>{lowStockCount} Low Stock</Text>
          </View>
        )}
      </View>

      {/* Category Horizontal Filter */}
      {categories.length > 0 && (
        <View style={styles.catFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsScroll}>
            <TouchableOpacity
              style={[styles.catFilterChip, selectedCatId === 'ALL' && styles.catFilterChipActive]}
              onPress={() => setSelectedCatId('ALL')}
            >
              <Text style={[styles.catFilterText, selectedCatId === 'ALL' && styles.catFilterTextActive]}>
                All ({items.length})
              </Text>
            </TouchableOpacity>
            {categories.map((c) => {
              const active = String(selectedCatId) === String(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catFilterChip, active && styles.catFilterChipActive]}
                  onPress={() => setSelectedCatId(c.id)}
                >
                  <Text style={[styles.catFilterText, active && styles.catFilterTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading store inventory...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="inventory" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Inventory Items Found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />}
        />
      )}

      {/* Floating Add Item Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setAddModalVisible(true)}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Item Detail & Actions Modal */}
      {selectedItem && (
        <Modal
          visible={detailModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={styles.iconCircleBig}>
                  <MaterialIcons name="inventory-2" size={28} color="#0284c7" />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={styles.detailItemName}>{selectedItem.name || selectedItem.itemName}</Text>
                  <Text style={styles.detailItemCode}>Code: {selectedItem.itemCode || 'ITM'}</Text>
                </View>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Available Stock</Text>
                  <Text style={[styles.gridVal, { color: '#0284c7', fontSize: 16 }]}>
                    {Number(selectedItem.quantityAvailable || selectedItem.currentStock || selectedItem.stock || 0)} {selectedItem.unit || 'Pcs'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Category</Text>
                  <Text style={styles.gridVal}>{selectedItem.category?.name || selectedItem.categoryName || 'General'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Unit Price</Text>
                  <Text style={styles.gridVal}>₹{Number(selectedItem.unitPrice || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Selling Price</Text>
                  <Text style={styles.gridVal}>₹{Number(selectedItem.sellingPrice || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Reorder Level</Text>
                  <Text style={styles.gridVal}>{selectedItem.reorderLevel || selectedItem.minimumStock || 5} {selectedItem.unit || 'Pcs'}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Rack / Shelf</Text>
                  <Text style={styles.gridVal}>{selectedItem.rackNumber || 'N/A'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteItem(selectedItem)}
              >
                <MaterialIcons name="delete-outline" size={20} color="#dc2626" />
                <Text style={styles.deleteBtnText}>Delete Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Item Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.formCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleIconRow}>
                <MaterialIcons name="add-box" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Add Inventory Item</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.formLabel}>Item Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. A4 Copy Book 200 Pages"
                placeholderTextColor="#94a3b8"
                value={itemName}
                onChangeText={setItemName}
              />

              {/* Category selector */}
              <Text style={styles.formLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {categories.map((c) => {
                  const sel = itemCatId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, sel && styles.chipSelected]}
                      onPress={() => setItemCatId(c.id)}
                    >
                      <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.twoColRow}>
                <View style={styles.col}>
                  <Text style={styles.formLabel}>Unit</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Pcs, Box, Kg"
                    placeholderTextColor="#94a3b8"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.formLabel}>Initial Stock</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="10"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={openingStock}
                    onChangeText={setOpeningStock}
                  />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={styles.col}>
                  <Text style={styles.formLabel}>Cost Price (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="₹ 0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={unitPrice}
                    onChangeText={setUnitPrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.formLabel}>Selling Price (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="₹ 0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                  />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={styles.col}>
                  <Text style={styles.formLabel}>Low Stock Alert</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="5"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={reorderLevel}
                    onChangeText={setReorderLevel}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.formLabel}>Rack / Shelf</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. A-12"
                    placeholderTextColor="#94a3b8"
                    value={rackNumber}
                    onChangeText={setRackNumber}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, savingItem && { opacity: 0.7 }]}
                disabled={savingItem}
                onPress={handleAddItem}
              >
                {savingItem ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Add Item</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchContainer: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  statChipDanger: {
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    borderColor: '#fca5a5',
    gap: 4,
  },
  statDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  catFilterContainer: {
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 8,
  },
  catChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  catFilterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleBig: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '700',
    marginTop: 2,
  },
  stockCol: {
    alignItems: 'flex-end',
  },
  stockQty: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stockUnit: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  lowBadge: {
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  lowBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailItemName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailItemCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 16,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: colors.inputBg,
    padding: 10,
    borderRadius: 8,
  },
  gridLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 20,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  formCard: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formScroll: {
    paddingBottom: 30,
    gap: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 6,
  },
  formInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    color: colors.textPrimary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 18,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

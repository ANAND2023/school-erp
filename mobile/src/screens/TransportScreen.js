import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { transportApi } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export default function TransportScreen() {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [activeTab, setActiveTab] = useState('vehicles'); // 'vehicles' or 'routes'
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Vehicle Modal
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [regNo, setRegNo] = useState('');
  const [vehicleType, setVehicleType] = useState('Bus');
  const [capacity, setCapacity] = useState('32');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Add / Edit Route Modal with Stops Editor
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [savingRoute, setSavingRoute] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehRes, routeRes] = await Promise.allSettled([
        transportApi.getVehicles(),
        transportApi.getRoutes(),
      ]);

      if (vehRes.status === 'fulfilled' && vehRes.value?.data?.success) {
        setVehicles(vehRes.value.data.data || []);
      }
      if (routeRes.status === 'fulfilled' && routeRes.value?.data?.success) {
        setRoutes(routeRes.value.data.data || []);
      }
    } catch (e) {
      console.warn('Transport fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call.');
    });
  };

  // Open Vehicle Add / Edit
  const handleOpenAddVehicle = () => {
    setEditingVehicle(null);
    setRegNo('');
    setVehicleType('Bus');
    setCapacity('32');
    setDriverName('');
    setDriverPhone('');
    setVehicleModalVisible(true);
  };

  const handleOpenEditVehicle = (veh) => {
    setEditingVehicle(veh);
    setRegNo(veh.registrationNo || '');
    setVehicleType(veh.vehicleType || 'Bus');
    setCapacity(veh.capacity ? String(veh.capacity) : '32');
    setDriverName(veh.driverName || (veh.driver ? `${veh.driver.firstName || ''} ${veh.driver.lastName || ''}`.trim() : ''));
    setDriverPhone(veh.driverPhone || veh.driver?.mobile || '');
    setVehicleModalVisible(true);
  };

  const handleSaveVehicle = async () => {
    if (!regNo.trim()) {
      Alert.alert('Validation Error', 'Vehicle registration number is required.');
      return;
    }

    try {
      setSavingVehicle(true);
      const parsedCapacity = parseInt(capacity, 10);
      const payload = {
        id: editingVehicle ? editingVehicle.id : 0,
        registrationNo: regNo.trim().toUpperCase(),
        vehicleType: vehicleType,
        capacity: isNaN(parsedCapacity) || parsedCapacity <= 0 ? 30 : parsedCapacity,
        driverName: driverName.trim() || null,
        driverPhone: driverPhone.trim() || null,
        status: editingVehicle?.status || 'Active',
      };

      const res = await transportApi.saveVehicle(payload);
      if (res.data?.success) {
        Alert.alert('Success! 🚌', `Vehicle ${payload.registrationNo} ${editingVehicle ? 'updated' : 'saved'} successfully!`);
        setVehicleModalVisible(false);
        setEditingVehicle(null);
        setRegNo('');
        setDriverName('');
        setDriverPhone('');
        loadData();
      } else {
        Alert.alert('Failed', res.data?.message || 'Could not save vehicle.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Error saving vehicle.';
      Alert.alert('Error', msg);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = (veh) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to remove vehicle ${veh.registrationNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transportApi.deleteVehicle(veh.id);
              Alert.alert('Deleted', 'Vehicle removed.');
              loadData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete vehicle.');
            }
          },
        },
      ]
    );
  };

  // Open Route Add / Edit
  const handleOpenAddRoute = () => {
    setEditingRoute(null);
    setRouteName('');
    setRouteDesc('');
    setAssignedVehicleId(vehicles[0]?.id || null);
    setRouteStops([
      { stopName: 'Campus Main Gate', pickupTime: '07:30 AM', dropTime: '02:00 PM', fare: 0 },
    ]);
    setRouteModalVisible(true);
  };

  const handleOpenEditRoute = (r) => {
    setEditingRoute(r);
    setRouteName(r.routeName || '');
    setRouteDesc(r.description || '');
    setAssignedVehicleId(r.vehicleId || (vehicles[0]?.id || null));
    const stopsList = (r.stops || []).map((s) => ({
      id: s.id || 0,
      stopName: s.stopName || s.name || '',
      pickupTime: s.pickupTime || s.pickUpTime || '',
      dropTime: s.dropTime || '',
      fare: s.fare !== undefined ? String(s.fare) : (s.monthlyFare !== undefined ? String(s.monthlyFare) : '0'),
    }));
    setRouteStops(stopsList);
    setRouteModalVisible(true);
  };

  const handleAddStop = () => {
    setRouteStops((prev) => [
      ...prev,
      { stopName: '', pickupTime: '07:45 AM', dropTime: '02:15 PM', fare: '500' },
    ]);
  };

  const handleUpdateStop = (index, field, value) => {
    setRouteStops((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      return arr;
    });
  };

  const handleRemoveStop = (index) => {
    setRouteStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      Alert.alert('Validation Error', 'Route name is required.');
      return;
    }

    try {
      setSavingRoute(true);
      const payload = {
        id: editingRoute ? editingRoute.id : 0,
        routeName: routeName.trim(),
        description: routeDesc.trim() || null,
        vehicleId: assignedVehicleId || null,
        stops: routeStops.map((s, idx) => ({
          id: s.id || 0,
          stopName: s.stopName?.trim() || `Stop ${idx + 1}`,
          pickupTime: s.pickupTime?.trim() || null,
          dropTime: s.dropTime?.trim() || null,
          fare: parseFloat(s.fare) || 0,
          orderIndex: idx + 1,
        })),
      };

      const res = await transportApi.saveRoute(payload);
      if (res.data?.success) {
        Alert.alert('Success! 🚏', `Route "${payload.routeName}" ${editingRoute ? 'updated' : 'saved'} successfully!`);
        setRouteModalVisible(false);
        setEditingRoute(null);
        setRouteName('');
        setRouteDesc('');
        setRouteStops([]);
        loadData();
      } else {
        Alert.alert('Failed', res.data?.message || 'Could not save route.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving route.';
      Alert.alert('Error', msg);
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = (route) => {
    Alert.alert(
      'Delete Route',
      `Are you sure you want to remove route "${route.routeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await transportApi.deleteRoute(route.id);
              Alert.alert('Deleted', 'Route removed.');
              loadData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete route.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'vehicles' && styles.tabItemActive]}
          onPress={() => setActiveTab('vehicles')}
        >
          <MaterialIcons name="directions-bus" size={18} color={activeTab === 'vehicles' ? '#0284c7' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'vehicles' && styles.tabItemTextActive]}>
            Buses & Vans ({vehicles.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'routes' && styles.tabItemActive]}
          onPress={() => setActiveTab('routes')}
        >
          <MaterialIcons name="alt-route" size={18} color={activeTab === 'routes' ? '#0284c7' : '#64748b'} />
          <Text style={[styles.tabItemText, activeTab === 'routes' && styles.tabItemTextActive]}>
            Routes & Stops ({routes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading transport data...</Text>
        </View>
      ) : activeTab === 'vehicles' ? (
        vehicles.length === 0 ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="directions-bus" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Vehicles Registered</Text>
          </View>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const dPhone = item.driverPhone || item.driver?.mobile;
              const dName = item.driverName || (item.driver ? `${item.driver.firstName || ''} ${item.driver.lastName || ''}`.trim() : null);

              return (
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.iconCircle}>
                      <MaterialIcons name="directions-bus" size={24} color="#0284c7" />
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.busNo}>{item.registrationNo}</Text>
                      <Text style={styles.busMeta}>
                        Type: {item.vehicleType || 'School Bus'} • Capacity: {item.capacity || '30'} Seats
                      </Text>
                      <Text style={styles.driverText}>
                        Driver: {dName || 'Not Assigned'}
                      </Text>
                    </View>

                    <View style={styles.vehActionsRow}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditVehicle(item)}>
                        <MaterialIcons name="edit" size={17} color="#4f46e5" />
                      </TouchableOpacity>
                      {dPhone ? (
                        <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(dPhone)}>
                          <MaterialIcons name="phone" size={17} color="#0284c7" />
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteVehicle(item)}>
                        <MaterialIcons name="delete-outline" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : routes.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="alt-route" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Routes Defined</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.routeHeader}>
                <View style={styles.routeTitleCol}>
                  <Text style={styles.routeName}>{item.routeName}</Text>
                  {item.description ? <Text style={styles.routeDesc}>{item.description}</Text> : null}
                </View>
                <View style={styles.routeHeaderActions}>
                  <View style={styles.stopsBadge}>
                    <Text style={styles.stopsBadgeText}>{item.stops?.length || 0} Stops</Text>
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditRoute(item)}>
                    <MaterialIcons name="edit" size={17} color="#4f46e5" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteRoute(item)}>
                    <MaterialIcons name="delete-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stops Preview */}
              {item.stops && item.stops.length > 0 && (
                <View style={styles.stopsList}>
                  {item.stops.map((s, idx) => (
                    <View key={idx} style={styles.stopRow}>
                      <View style={styles.dot} />
                      <Text style={styles.stopName}>{s.stopName || s.name}</Text>
                      {s.pickupTime ? <Text style={styles.stopTime}>Pick: {s.pickupTime}</Text> : null}
                      {s.fare ? <Text style={styles.stopFare}>₹{s.fare}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => {
          if (activeTab === 'vehicles') {
            handleOpenAddVehicle();
          } else {
            handleOpenAddRoute();
          }
        }}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Add / Edit Vehicle Modal */}
      <Modal
        visible={vehicleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.formCard}>
            <View style={styles.modalHeader}>
              <View style={styles.titleIconRow}>
                <MaterialIcons name={editingVehicle ? "edit" : "directions-bus"} size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingVehicle ? 'Edit School Vehicle' : 'Add New School Vehicle'}</Text>
              </View>
              <TouchableOpacity onPress={() => setVehicleModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.formLabel}>Registration Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. UP 14 AB 1234"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={regNo}
                onChangeText={setRegNo}
              />

              <Text style={styles.formLabel}>Vehicle Type</Text>
              <View style={styles.chipsRow}>
                {['Bus', 'Mini Bus', 'Van', 'Auto'].map((vt) => (
                  <TouchableOpacity
                    key={vt}
                    style={[styles.chip, vehicleType === vt && styles.chipSelected]}
                    onPress={() => setVehicleType(vt)}
                  >
                    <Text style={[styles.chipText, vehicleType === vt && styles.chipTextSelected]}>{vt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Seating Capacity</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 32"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />

              <Text style={styles.formLabel}>Driver Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Rajendra Prasad"
                placeholderTextColor="#94a3b8"
                value={driverName}
                onChangeText={setDriverName}
              />

              <Text style={styles.formLabel}>Driver Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                value={driverPhone}
                onChangeText={setDriverPhone}
              />

              <TouchableOpacity
                style={[styles.submitBtn, savingVehicle && { opacity: 0.7 }]}
                disabled={savingVehicle}
                onPress={handleSaveVehicle}
              >
                {savingVehicle ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#ffffff" />
                    <Text style={styles.submitBtnText}>{editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add / Edit Route Modal with Dynamic Stops Editor */}
      <Modal
        visible={routeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRouteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.formCard, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.titleIconRow}>
                <MaterialIcons name={editingRoute ? "edit" : "alt-route"} size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>{editingRoute ? 'Edit Route & Stops' : 'Add New Transport Route'}</Text>
              </View>
              <TouchableOpacity onPress={() => setRouteModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.formLabel}>Route Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Route 1 - Civil Lines to Campus"
                placeholderTextColor="#94a3b8"
                value={routeName}
                onChangeText={setRouteName}
              />

              <Text style={styles.formLabel}>Description / Landmarks</Text>
              <TextInput
                style={[styles.formInput, { height: 50 }]}
                placeholder="e.g. Via Railway Station, Golghar, District Hospital"
                placeholderTextColor="#94a3b8"
                multiline
                value={routeDesc}
                onChangeText={setRouteDesc}
              />

              {vehicles.length > 0 && (
                <>
                  <Text style={styles.formLabel}>Assign Vehicle</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {vehicles.map((v) => {
                      const sel = assignedVehicleId === v.id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[styles.chip, sel && styles.chipSelected]}
                          onPress={() => setAssignedVehicleId(v.id)}
                        >
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                            {v.registrationNo} ({v.vehicleType || 'Bus'})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Dynamic Stops Editor Section */}
              <View style={styles.stopsHeaderRow}>
                <Text style={styles.stopsSectionTitle}>Stops & Schedule ({routeStops.length})</Text>
                <TouchableOpacity style={styles.addStopBtn} onPress={handleAddStop}>
                  <MaterialIcons name="add" size={16} color="#0284c7" />
                  <Text style={styles.addStopBtnText}>Add Stop</Text>
                </TouchableOpacity>
              </View>

              {routeStops.length === 0 ? (
                <View style={styles.noStopsBox}>
                  <Text style={styles.noStopsText}>No stops added yet. Tap "+ Add Stop" above.</Text>
                </View>
              ) : (
                routeStops.map((stop, index) => (
                  <View key={index} style={styles.stopCard}>
                    <View style={styles.stopCardHeader}>
                      <Text style={styles.stopCardIndex}>Stop #{index + 1}</Text>
                      <TouchableOpacity onPress={() => handleRemoveStop(index)}>
                        <MaterialIcons name="close" size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={[styles.formInput, { marginBottom: 6 }]}
                      placeholder="Stop Name (e.g. Golghar Chauraha)"
                      placeholderTextColor="#94a3b8"
                      value={stop.stopName}
                      onChangeText={(val) => handleUpdateStop(index, 'stopName', val)}
                    />

                    <View style={styles.stopTimingRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopFieldLabel}>Pickup Time</Text>
                        <TextInput
                          style={styles.stopMiniInput}
                          placeholder="07:30 AM"
                          placeholderTextColor="#94a3b8"
                          value={stop.pickupTime}
                          onChangeText={(val) => handleUpdateStop(index, 'pickupTime', val)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopFieldLabel}>Drop Time</Text>
                        <TextInput
                          style={styles.stopMiniInput}
                          placeholder="02:15 PM"
                          placeholderTextColor="#94a3b8"
                          value={stop.dropTime}
                          onChangeText={(val) => handleUpdateStop(index, 'dropTime', val)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopFieldLabel}>Fare (₹)</Text>
                        <TextInput
                          style={styles.stopMiniInput}
                          placeholder="500"
                          keyboardType="numeric"
                          placeholderTextColor="#94a3b8"
                          value={String(stop.fare || '')}
                          onChangeText={(val) => handleUpdateStop(index, 'fare', val)}
                        />
                      </View>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={[styles.submitBtn, savingRoute && { opacity: 0.7 }]}
                disabled={savingRoute}
                onPress={handleSaveRoute}
              >
                {savingRoute ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#ffffff" />
                    <Text style={styles.submitBtnText}>{editingRoute ? 'Update Route' : 'Save Route'}</Text>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 10,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.inputBg,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabItemTextActive: {
    color: '#0284c7',
    fontWeight: '700',
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
  },
  busNo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  busMeta: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  driverText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vehActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#1e1b4b' : '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  delBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routeTitleCol: {
    flex: 1,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  routeDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  routeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopsBadge: {
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stopsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  stopsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 6,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  stopName: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  stopTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  stopFare: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
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
    gap: 8,
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
  stopsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  stopsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#1e3a8a' : '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addStopBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  noStopsBox: {
    padding: 12,
    backgroundColor: colors.inputBg,
    borderRadius: 8,
    alignItems: 'center',
  },
  noStopsText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stopCard: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stopCardIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  stopTimingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stopFieldLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  stopMiniInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 34,
    fontSize: 12,
    color: colors.textPrimary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

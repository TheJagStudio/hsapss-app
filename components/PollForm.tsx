import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAtom } from 'jotai';
import { userAtom } from '../state/atoms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: number;
  user_type: string;
  first_name: string;
  last_name: string;
  profile_image: string;
}

interface Voter {
  id: number;
  first_name: string;
  last_name: string;
  profile_image: string;
}

interface PollOption {
  id: number;
  optionText: string;
  count: number;
  precentage: number;
  voters: Voter[];
}

interface Poll {
  id: number;
  question: string;
  image?: string;
  created_by: User;
  options: PollOption[];
}

const PollForm = () => {
  const [pollsData, setPollsData] = useState<Poll[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: number]: number }>({});
  const [showVoters, setShowVoters] = useState<{ [key: number]: boolean }>({});
  const [user] = useAtom(userAtom) as [User, any];
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPolls = async () => {
    try {
      const tokens = JSON.parse(await AsyncStorage.getItem('hsapss_tokens') || '{}');
      const response = await fetch(`${BACKEND_URL}/api/polls/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokens?.access_token}`,
        },
      });
      const data = await response.json();
      setPollsData(data?.data || []);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleVote = async (pollId: number, optionId: number) => {
    try {
      const tokens = JSON.parse(await AsyncStorage.getItem('hsapss_tokens') || '{}');
      const response = await fetch(`${BACKEND_URL}/api/polls/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens?.access_token}`,
        },
        body: JSON.stringify({
          poll_id: pollId,
          option_id: optionId,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        if (data.poll) {
          setPollsData((prev) =>
            prev.map((poll) => (poll.id === pollId ? data.poll : poll))
          );
        } else {
          fetchPolls();
        }
      } else {
        alert(data.message || 'Error submitting vote');
      }
    } catch (error: any) {
      alert('Error submitting vote: ' + error.message);
    }
  };

  const handleOptionChange = (pollId: number, optionId: number) => {
    setSelectedOptions((prev) => ({ ...prev, [pollId]: optionId }));
    handleVote(pollId, optionId);
  };

  const toggleVoters = (pollId: number) => {
    setShowVoters((prev) => ({ ...prev, [pollId]: !prev[pollId] }));
  };

  const handleDeletePoll = async (pollId: number) => {
    setIsDeleting(true);
    try {
      const tokens = JSON.parse(await AsyncStorage.getItem('hsapss_tokens') || '{}');
      const response = await fetch(`${BACKEND_URL}/api/delete-poll/${pollId}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokens?.access_token}`,
        },
      });

      const data = await response.json();
      if (data.status === 'success') {
        setPollsData((prev) => prev.filter((poll) => poll.id !== pollId));
        setDeleteConfirmModal(null);
      } else {
        alert(data.message || 'Error deleting poll');
      }
    } catch (error: any) {
      alert('Error deleting poll: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const canCreatePolls =
    user &&
    (user.user_type === 'superadmin' ||
      user.user_type === 'regionadmin' ||
      user.user_type === 'karyakarta');

  if (loading) {
    return (
      <View className="p-3 items-center justify-center h-32">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (pollsData.length === 0) {
    return null;
  }

  return (
    <View className="p-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-bold text-3xl text-primary-700">Polls</Text>
        {canCreatePolls && (
          <TouchableOpacity
            className="px-4 py-2 bg-primary-700 active:bg-primary-800 rounded-lg"
          >
            <Text className="text-white text-sm font-medium">Create Poll</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3 pb-2">
        {pollsData?.map((pollData) => {
          const userVotedOption = pollData.options.find((opt) =>
            opt.voters.some((voter) => voter?.id === user?.id)
          );
          const selectedOption = userVotedOption?.id || selectedOptions[pollData.id];

          return (
            <View key={pollData.id} className="w-96 bg-white rounded-lg shadow-md p-3 mr-3">
              <View className="flex-col h-full w-full">
                <View className="space-y-4 flex-1">
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center gap-3">
                        <Image
                          source={{
                            uri: `${BACKEND_URL}${pollData?.created_by?.profile_image}`,
                          }}
                          className="w-10 h-10 rounded-full"
                        />
                        <Text className="text-primary-800 font-semibold">
                          {pollData?.created_by?.first_name} {pollData?.created_by?.last_name}
                        </Text>
                      </View>
                      {user?.id === pollData?.created_by?.id && (
                        <View className="flex-row items-center gap-2">
                          <TouchableOpacity className="p-2">
                            <Ionicons name="pencil" size={20} color="#3b82f6" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setDeleteConfirmModal(pollData.id)}
                            className="p-2"
                          >
                            <Ionicons name="trash" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {pollData?.image && (
                      <Image
                        source={{ uri: `${BACKEND_URL}${pollData?.image}` }}
                        className="w-full h-48 rounded-lg mb-3"
                        resizeMode="cover"
                      />
                    )}
                    <Text className="w-full mt-1 font-semibold text-primary-800">
                      {pollData?.question}
                    </Text>
                  </View>

                  <View className="space-y-3">
                    {pollData?.options.map((option) => (
                      <View key={option.id} className="space-y-2">
                        <View className="flex-row items-center gap-3">
                          <TouchableOpacity
                            onPress={() => handleOptionChange(pollData.id, option.id)}
                            className="w-7 h-7 items-center justify-center"
                          >
                            <View
                              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                                userVotedOption?.id === option.id ||
                                selectedOption === option.id
                                  ? 'border-primary-600 bg-primary-600'
                                  : 'border-primary-400'
                              }`}
                            >
                              {(userVotedOption?.id === option.id ||
                                selectedOption === option.id) && (
                                <Text className="text-white text-xs">✓</Text>
                              )}
                            </View>
                          </TouchableOpacity>

                          <View className="flex-1 flex-col gap-2">
                            <View className="flex-row items-center justify-between pr-5">
                              <Text className="text-primary-800">{option?.optionText}</Text>
                              <View className="flex-row items-center">
                                {option?.voters.slice(0, 3).map((voter, index3) => (
                                  <Image
                                    key={index3}
                                    source={{
                                      uri: `${BACKEND_URL}${voter?.profile_image}`,
                                    }}
                                    className="w-7 h-7 rounded-full -ml-1 border-2 border-white"
                                    style={{ zIndex: 3 - index3 }}
                                  />
                                ))}
                                <Text className="text-primary-600 ml-2">{option?.count}</Text>
                              </View>
                            </View>
                            <View className="w-full h-2 rounded-full overflow-hidden bg-primary-200">
                              <View
                                className="bg-primary-600 h-full rounded-full"
                                style={{ width: `${option?.precentage}%` }}
                              />
                            </View>
                          </View>
                        </View>

                        {showVoters[pollData.id] && option?.voters.length > 0 && (
                          <View className="ml-10 p-3 bg-primary-50 rounded-lg border border-primary-200">
                            <Text className="text-sm font-medium text-primary-800 mb-2">
                              Voters for {option?.optionText}:
                            </Text>
                            <View className="space-y-2">
                              {option?.voters.map((voter, voterIndex) => (
                                <View key={voterIndex} className="flex-row items-center gap-2">
                                  <Image
                                    source={{
                                      uri: `${BACKEND_URL}${voter?.profile_image}`,
                                    }}
                                    className="w-6 h-6 rounded-full"
                                  />
                                  <Text className="text-sm text-primary-700">
                                    {voter?.first_name} {voter?.last_name}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>

                <View className="w-full flex-col gap-2 mt-4">
                  <View className="h-px bg-primary-200" />
                  <TouchableOpacity
                    onPress={() => toggleVoters(pollData.id)}
                    className="p-2 border border-primary-800 bg-primary-500 active:bg-primary-600 rounded-lg"
                  >
                    <Text className="text-white text-center">
                      {showVoters[pollData.id] ? 'Hide Votes' : 'View Votes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmModal !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/75 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 max-w-md w-11/12">
            <View className="flex-col items-center gap-4">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center">
                <Ionicons name="trash" size={32} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-800">Delete Poll?</Text>
              <Text className="text-gray-600 text-center">
                Are you sure you want to delete this poll? This action cannot be undone.
              </Text>
              <View className="flex-row gap-3 w-full mt-4">
                <TouchableOpacity
                  onPress={() => setDeleteConfirmModal(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg"
                >
                  <Text className="text-gray-700 text-center font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteConfirmModal && handleDeletePoll(deleteConfirmModal)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-500 rounded-lg"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-center font-bold">Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PollForm;

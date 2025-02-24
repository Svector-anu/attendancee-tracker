import React, { useState, useEffect } from 'react';
import { Calendar } from './components/components/ui/calendar';
import { Button } from './components/components/ui/button';
import { Input } from './components/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '/components/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/components/ui/tabs';
import { Alert, AlertDescription } from './components/components/ui/alert';
import { Badge } from './components/components/ui/badge';

const AttendanceTracker = () => {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [name, setName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [adminTarget, setAdminTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Contract configuration
  const contractAddress = "YOUR_CONTRACT_ADDRESS";
  const contractABI = [
    "function createProfile(string _name) public",
    "function markAttendance(uint256 timestamp) public",
    "function modifyAttendance(address _user, uint256 timestamp, bool status) public",
    "function evictUser(address _user) public",
    "function checkAttendance(address _user, uint256 timestamp) public view returns (bool)",
    "function admin() public view returns (address)",
    "function users(address) public view returns (string name, bool isRegistered)"
  ];

  useEffect(() => {
    const init = async () => {
      try {
        await connectWallet();
      } catch (err) {
        setError('Failed to initialize: ' + err.message);
      }
    };
    init();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Please install MetaMask!');
    }

    try {
      setLoading(true);
      setError('');
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);

      // Create contract instance
      const provider = new window.ethereum.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contractInstance = new window.ethereum.Contract(contractAddress, contractABI, signer);
      setContract(contractInstance);

      // Check if user is admin
      const adminAddress = await contractInstance.admin();
      setIsAdmin(adminAddress.toLowerCase() === accounts[0].toLowerCase());

      // Check if user is registered
      const userData = await contractInstance.users(accounts[0]);
      setIsRegistered(userData.isRegistered);
    } catch (err) {
      setError('Wallet connection failed: ' + err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!contract || !name.trim()) {
      setError('Please enter a name');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const tx = await contract.createProfile(name);
      await tx.wait();
      setIsRegistered(true);
    } catch (err) {
      setError('Failed to create profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const tx = await contract.markAttendance(timestamp);
      await tx.wait();
      await handleCheckAttendance();
    } catch (err) {
      setError('Failed to mark attendance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAttendance = async () => {
    if (!contract) {
      setError('Contract not initialized');
      return;
    }
    
    try {
      setError('');
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const status = await contract.checkAttendance(account, timestamp);
      setAttendanceStatus(status);
    } catch (err) {
      setError('Failed to check attendance: ' + err.message);
    }
  };

  const handleModifyAttendance = async (status) => {
    if (!contract || !adminTarget) {
      setError('Please enter a user address');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const timestamp = Math.floor(selectedDate.getTime() / 1000);
      const tx = await contract.modifyAttendance(adminTarget, timestamp, status);
      await tx.wait();
    } catch (err) {
      setError('Failed to modify attendance: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEvictUser = async () => {
    if (!contract || !adminTarget) {
      setError('Please enter a user address');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const tx = await contract.evictUser(adminTarget);
      await tx.wait();
    } catch (err) {
      setError('Failed to evict user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Attendance Tracker</h1>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="outline" className="px-4 py-1">
              {account ? account.slice(0, 6) + '...' + account.slice(-4) : 'Not Connected'}
            </Badge>
            {isAdmin && (
              <Badge variant="secondary" className="px-4 py-1">
                Admin
              </Badge>
            )}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {!isRegistered ? (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Profile</CardTitle>
              <CardDescription>Enter your name to get started with attendance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-4"
              />
              <Button 
                onClick={handleCreateProfile} 
                disabled={loading || !name.trim()}
                className="w-full"
              >
                Create Profile
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="mark" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
              <TabsTrigger value="check">Check Status</TabsTrigger>
            </TabsList>

            <TabsContent value="mark">
              <Card>
                <CardHeader>
                  <CardTitle>Mark Your Attendance</CardTitle>
                  <CardDescription>Select a date to mark your attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleMarkAttendance} 
                    disabled={loading}
                    className="w-full"
                  >
                    Mark Attendance
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="check">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Status</CardTitle>
                  <CardDescription>Check your attendance for any date</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                  {attendanceStatus !== null && (
                    <Alert>
                      <AlertDescription>
                        {attendanceStatus ? 'Present' : 'Absent'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleCheckAttendance}
                    variant="outline" 
                    className="w-full"
                  >
                    Check Status
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Admin Panel */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>Manage user attendance and accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="User Address"
                value={adminTarget}
                onChange={(e) => setAdminTarget(e.target.value)}
              />
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
            <CardFooter className="flex-col space-y-2">
              <div className="flex space-x-2 w-full">
                <Button 
                  onClick={() => handleModifyAttendance(true)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading || !adminTarget}
                >
                  Mark Present
                </Button>
                <Button 
                  onClick={() => handleModifyAttendance(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading || !adminTarget}
                >
                  Mark Absent
                </Button>
              </div>
              <Button 
                onClick={handleEvictUser}
                variant="destructive"
                className="w-full"
                disabled={loading || !adminTarget}
              >
                Evict User
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracker;
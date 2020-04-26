#!/bin/bash

# Install required software
sudo apt update
sudo apt install libusb-1.0 cmake sox at predict libxft2 libxft-dev wget git -y

# Install nodeJS
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt install nodejs -y
sudo npm install -g serverless
sudo chown -R $USER:$(id -gn $USER) /root/.config

# Clone scripts
git clone https://github.com/jpekala/wx-ground-station.git
cd wx-ground-station

# Define current directory and output to log
currentDir=`echo $PWD`

# Copy of blacklist file
if [ -e /etc/modprobe.d/rtlsdr.conf ]; then
    echo "RTL-SDR dongles already blacklisted"
else
    sudo cp templates/no-rtl.conf /etc/modprobe.d/no-rtl.conf
    echo "RTL-SDR dongles blacklist installed"

# Download and build RTL-SDR
if [ -e /usr/local/bin/rtl_fm ]; then
    echo "rtl-sdr is already installed"
else
    echo "Installing rtl-sdr"
(
    cd ~
    git clone https://github.com/keenerd/rtl-sdr.git
    cd rtl-sdr/
    mkdir build
    cd build
    cmake ../ -DINSTALL_UDEV_RULES=ON
    make
    sudo make install
    sudo ldconfig
    cd ~
    sudo cp ./rtl-sdr/rtl-sdr.rules /etc/udev/rules.d/
)

# Download and build RTL-SDR-BLOG
if [ -e /usr/local/bin/rtl_biast ]; then
    echo "rtl_biast is already installed"
else
    echo "Installing rtl_biast"
(
    cd ~
    git clone https://github.com/rtlsdrblog/rtl-sdr-blog
    cd rtl-sdr-blog
    mkdir build
    cd build
    cmake .. -DDETACH_KERNEL_DRIVER=ON
    make
    sudo cd src/rtl_biast /usr/local/bin/rtl_biast
)

# Download and Install wxtoimg
if [ -e /usr/local/bin/xwxtoimg ]; then
    echo "WxToIMG is already installed"
else
    (
        cd ~
        wget https://wxtoimgrestored.xyz/beta/wxtoimg-armhf-2.11.2-beta.deb
        sudo dpkg -i wxtoimg-armhf-2.11.2-beta.deb
    )
    # Copy wximgrc template
    cp templates/wxtoimgrc ~/.wxtoimgrc
    
    # Running wxtoimg to accpted user license
    wxtoimg

# Configure predict
if [ -d "$HOME/.predict" ] && [ -e "$HOME/.predict/predict.qth" ]; then
    echo "$HOME/.predict/predict.qth already exists"
else
    mkdir -p ~/.predict
    cp templates/predict.qth ~/.predict/predict.qth

# Look for audio, images and logs directories
if [ ! -d "audio" ]; then
    mkdir audio
fi

if [ ! -d "images" ]; then
    mkdir images
fi

if [ ! -d "logs" ]; then
    mkdir logs
fi
# Replace INSTALL_DIR with the current working directory inside of each file
# Assume current working directory will be final install path
sed -i "s|INSTALL_DIR|$currentDir|g" schedule_all.sh
sed -i "s|INSTALL_DIR|$currentDir|g" schedule_satellite.sh
sed -i "s|INSTALL_DIR|$currentDir|g" receive_and_process_satellite.sh

# Set execute rights for all
chmod +x schedule_all.sh
chmod +x schedule_satellite.sh
chmod +x receive_and_process_satellite.sh

# Add cronjob to run schedule_all.sh daily at mightnight
cronjobcmd="$currentDir/schedule_all.sh"
cronjob="0 0 * * * $cronjobcmd"
( crontab -l | grep -v -F "$cronjobcmd" ; echo "$cronjob" ) | crontab -

# installing aws-s3
(
    cd aws-s3
    npm install
)

# Configure awe-s3 env file
nano /aws-s3/.env

# installing awss-api
(
    cd aws-api
    npm install
    sls deploy
    echo "You will need to find the endpoints value and copy it."
    echo " "
    read -p "Copy Endpoints and Press enter to continue"
)

# Configure s3-vars.js
nano website/s3-vars.js

# Upload website content to AWS
echo " "
echo " "
echo "Upload your the contents of the website folder to your AWS Bucket."
echo "Make sure you mark your content public."
echo " "
echo " "
read -p "Once web content upload - Press enter to continue"

# Runnning the scheduler to test everything
echo "Testing install by manually running the scheduler"
./schedule_all.sh

# Final notes
echo "Please see the README for fine tuning and enabling BIAST"

# Rebooting
echo "reboot in 3 seconds"
sleep 3
sudo reboot now

# Look for audio, images and logs directories
# If they  don't exist, create the directories
if [ ! -d "audio" ]
then
    mkdir audio
fi

if [ ! -d "images" ]
then
    mkdir images
fi

if [ ! -d "logs" ]
then
    mkdir logs
fi

# Define current directory and output to log
currentDir=`echo $PWD`
echo "configuring for" $currentDir

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
